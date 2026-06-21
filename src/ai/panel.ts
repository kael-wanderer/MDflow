import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AISettings, Provider } from "./aisettings";
import { streamChat } from "./client";
import { buildMessages, type AttachedFile } from "./conversation";
import { lineDiff } from "./diff";
import { matchAccelerator } from "../keymap";
import { rankItems } from "../fuzzy";
import type { ChatMessage } from "./providers";

export type AIPanelDeps = {
  getSettings: () => AISettings;
  onSettingsChange: (settings: AISettings) => void;
  getDoc: () => { text: string; selection: string };
  onApply: (newText: string) => void;
  onInsert: (text: string) => void;
  onClose: () => void;
  getSendAccelerator: () => string;
  getWorkingDir: () => string | null;
  getFileList: () => { path: string; name: string }[];
};

export type AIPanel = {
  render: () => void;
  resize: () => void;
  addAttachments: (paths: string[]) => void;
};

const TEXT_EXTENSIONS = new Set([
  "md", "markdown", "txt", "text", "json", "jsonc", "csv", "tsv", "yaml", "yml",
  "toml", "ini", "cfg", "conf", "html", "htm", "xml", "svg", "css", "scss",
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "py", "rb", "rs", "go", "java", "c",
  "h", "cpp", "hpp", "cs", "sh", "bash", "zsh", "sql", "log", "env",
]);

function fileBasename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function isTextAttachment(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS.has(ext);
}

export function createAIPanel(
  panelElement: HTMLElement,
  deps: AIPanelDeps,
): AIPanel {
  const body = panelElement.querySelector<HTMLElement>(".ai-body")!;
  const tabs = panelElement.querySelectorAll<HTMLElement>(".ai-tab");
  panelElement
    .querySelector<HTMLElement>(".ai-close")!
    .addEventListener("click", deps.onClose);
  const history: ChatMessage[] = [];
  let referencedFiles: string[] = [];
  let refreshAttachments: () => void = () => {};
  const addAttachments = (paths: string[]): void => {
    for (const path of paths) {
      if (!referencedFiles.includes(path)) referencedFiles.push(path);
    }
    refreshAttachments();
  };
  let activeTab: "chat" | "terminal" = "chat";
  let editMode = false;
  let renderVersion = 0;
  let terminalView: {
    resize: () => void;
    destroy: () => void;
  } | null = null;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab as "chat" | "terminal";
      tabs.forEach((candidate) => {
        candidate.classList.toggle("active", candidate === tab);
      });
      render();
    });
  });

  function currentProvider(settings = deps.getSettings()): Provider | undefined {
    return (
      settings.providers.find(
        (provider) => provider.id === settings.defaultProvider,
      ) ?? settings.providers[0]
    );
  }

  function addActions(
    afterElement: HTMLElement,
    reply: string,
    wasEdit: boolean,
    document: { text: string; selection: string },
  ): void {
    const row = window.document.createElement("div");
    row.className = "ai-actions";
    const copy = window.document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => {
      void navigator.clipboard.writeText(reply);
    });
    const insert = window.document.createElement("button");
    insert.type = "button";
    insert.textContent = "Insert at cursor";
    insert.addEventListener("click", () => deps.onInsert(reply));
    row.append(copy, insert);

    if (wasEdit) {
      const apply = window.document.createElement("button");
      apply.type = "button";
      apply.textContent = "Apply (diff)";
      apply.addEventListener("click", () => {
        showDiff(
          row,
          document.selection.trim() ? document.selection : document.text,
          reply,
        );
      });
      row.appendChild(apply);
    }
    afterElement.after(row);
  }

  function showDiff(
    anchor: HTMLElement,
    oldText: string,
    newText: string,
  ): void {
    const view = window.document.createElement("div");
    view.className = "ai-diff";
    for (const line of lineDiff(oldText, newText)) {
      const lineElement = window.document.createElement("div");
      lineElement.className = `ai-diff-line ${line.type}`;
      const prefix =
        line.type === "add" ? "+ " : line.type === "del" ? "- " : "  ";
      lineElement.textContent = `${prefix}${line.text}`;
      view.appendChild(lineElement);
    }

    const actions = window.document.createElement("div");
    actions.className = "ai-actions";
    const accept = window.document.createElement("button");
    accept.type = "button";
    accept.textContent = "Accept";
    accept.addEventListener("click", () => {
      deps.onApply(newText);
      view.remove();
      actions.remove();
    });
    const reject = window.document.createElement("button");
    reject.type = "button";
    reject.textContent = "Reject";
    reject.addEventListener("click", () => {
      view.remove();
      actions.remove();
    });
    actions.append(accept, reject);
    anchor.after(view, actions);
  }

  function renderChat(): void {
    terminalView?.destroy();
    terminalView = null;
    body.innerHTML = `
      <div class="ai-messages"></div>
      <div class="ai-input-row">
        <div class="ai-control-row">
          <label>
            <span>Agent</span>
            <select class="ai-provider"></select>
          </label>
          <label>
            <span>Permission</span>
            <select class="ai-permission">
              <option value="ask">Ask before doing</option>
              <option value="bypass">Bypass approvals</option>
            </select>
          </label>
          <button class="ai-attach" type="button" title="Attach files">📎</button>
        </div>
        <label class="ai-edit">
          <input type="checkbox" class="ai-editmode" ${
            editMode ? "checked" : ""
          } />
          Edit mode
        </label>
        <div class="ai-attachments"></div>
        <div class="ai-input-wrap">
          <div class="ai-mention" hidden></div>
          <textarea class="ai-input" rows="3" placeholder="Ask about this document… (@ to mention a file)"></textarea>
        </div>
        <button class="ai-send" type="button">Send</button>
      </div>`;
    const messagesElement =
      body.querySelector<HTMLElement>(".ai-messages")!;
    const settings = deps.getSettings();
    const providerSelect =
      body.querySelector<HTMLSelectElement>(".ai-provider")!;
    for (const provider of settings.providers) {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.label;
      option.selected = provider.id === settings.defaultProvider;
      providerSelect.appendChild(option);
    }
    providerSelect.addEventListener("change", () => {
      deps.onSettingsChange({
        ...deps.getSettings(),
        defaultProvider: providerSelect.value,
      });
    });
    const permissionSelect =
      body.querySelector<HTMLSelectElement>(".ai-permission")!;
    permissionSelect.value = settings.permissionMode;
    permissionSelect.addEventListener("change", () => {
      deps.onSettingsChange({
        ...deps.getSettings(),
        permissionMode:
          permissionSelect.value === "bypass" ? "bypass" : "ask",
      });
    });
    body
      .querySelector<HTMLInputElement>(".ai-editmode")!
      .addEventListener("change", (event) => {
        editMode = (event.target as HTMLInputElement).checked;
      });

    const input = body.querySelector<HTMLTextAreaElement>(".ai-input")!;
    const attachments = body.querySelector<HTMLElement>(".ai-attachments")!;
    const mention = body.querySelector<HTMLElement>(".ai-mention")!;

    function renderAttachments(): void {
      attachments.replaceChildren();
      for (const path of referencedFiles) {
        const chip = document.createElement("span");
        chip.className = "ai-chip";
        const name = document.createElement("span");
        name.textContent = fileBasename(path);
        name.title = path;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "✕";
        remove.addEventListener("click", () => {
          referencedFiles = referencedFiles.filter((p) => p !== path);
          renderAttachments();
        });
        chip.append(name, remove);
        attachments.appendChild(chip);
      }
    }
    refreshAttachments = renderAttachments;
    renderAttachments();

    body
      .querySelector<HTMLButtonElement>(".ai-attach")!
      .addEventListener("click", () => {
        void open({ multiple: true }).then((selected) => {
          if (!selected) return;
          addAttachments(Array.isArray(selected) ? selected : [selected]);
        });
      });

    // @mention: fuzzy file picker triggered by an @token at the caret.
    let mentionItems: { path: string; name: string }[] = [];
    let mentionIndex = 0;
    let mentionRange: { start: number; end: number } | null = null;

    const hideMention = (): void => {
      mention.hidden = true;
      mentionItems = [];
      mentionRange = null;
    };

    const renderMention = (): void => {
      mention.replaceChildren();
      mentionItems.forEach((item, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = `ai-mention-item${index === mentionIndex ? " active" : ""}`;
        option.textContent = item.name;
        option.title = item.path;
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          chooseMention(index);
        });
        mention.appendChild(option);
      });
      mention.hidden = mentionItems.length === 0;
    };

    const chooseMention = (index: number): void => {
      const item = mentionItems[index];
      if (!item || !mentionRange) return;
      const value = input.value;
      input.value =
        value.slice(0, mentionRange.start) + value.slice(mentionRange.end);
      input.selectionStart = input.selectionEnd = mentionRange.start;
      addAttachments([item.path]);
      hideMention();
      input.focus();
    };

    const updateMention = (): void => {
      const caret = input.selectionStart ?? input.value.length;
      const before = input.value.slice(0, caret);
      const match = /(?:^|\s)@([^\s@]*)$/.exec(before);
      if (!match) {
        hideMention();
        return;
      }
      const query = match[1];
      mentionRange = { start: caret - query.length - 1, end: caret };
      const files = deps.getFileList();
      mentionItems = rankItems(query, files, (file) => file.name).slice(0, 8);
      mentionIndex = 0;
      renderMention();
    };

    input.addEventListener("input", updateMention);
    input.addEventListener("blur", () => window.setTimeout(hideMention, 120));

    const addBubble = (role: string, text: string): HTMLElement => {
      const element = window.document.createElement("div");
      element.className = `ai-bubble ai-${role}`;
      element.textContent = text;
      messagesElement.appendChild(element);
      messagesElement.scrollTop = messagesElement.scrollHeight;
      return element;
    };

    for (const message of history) {
      addBubble(message.role, message.content);
    }

    const send = async (): Promise<void> => {
      const prompt = input.value.trim();
      const currentSettings = deps.getSettings();
      const provider = currentProvider(currentSettings);
      if (!prompt) return;
      if (!provider) {
        addBubble(
          "error",
          "No AI provider configured. Add one in AI Settings.",
        );
        return;
      }

      input.value = "";
      const attached = [...referencedFiles];
      const attachLine = attached.length
        ? `\n\n📎 ${attached.map(fileBasename).join(", ")}`
        : "";
      addBubble("user", prompt + attachLine);

      // CLI agents read files themselves (pass paths + run in the folder);
      // HTTP models can't, so inline text-file contents and skip the rest.
      let files: AttachedFile[] = [];
      let attachmentPaths: string[] = [];
      if (provider.type === "command") {
        attachmentPaths = attached;
      } else if (attached.length) {
        const skipped: string[] = [];
        for (const path of attached) {
          if (!isTextAttachment(path)) {
            skipped.push(fileBasename(path));
            continue;
          }
          try {
            const content = await invoke<string>("read_file", { path });
            files.push({ name: fileBasename(path), content });
          } catch {
            skipped.push(fileBasename(path));
          }
        }
        if (skipped.length) {
          addBubble(
            "error",
            `Skipped (not readable as text for this model): ${skipped.join(", ")}. Use a CLI agent for images/PDFs.`,
          );
        }
      }
      referencedFiles = [];
      refreshAttachments();

      const document = deps.getDoc();
      const messages = buildMessages({
        history,
        prompt,
        docText: document.text,
        selection: document.selection,
        editMode,
        files,
      });
      const replyElement = addBubble("assistant", "");
      let reply = "";
      try {
        await streamChat(
          provider,
          messages,
          (chunk) => {
            reply += chunk;
            replyElement.textContent = reply;
            messagesElement.scrollTop = messagesElement.scrollHeight;
          },
          currentSettings.permissionMode,
          { cwd: deps.getWorkingDir(), attachmentPaths },
        );
        history.push(
          { role: "user", content: prompt },
          { role: "assistant", content: reply },
        );
        addActions(replyElement, reply, editMode, document);
      } catch (error) {
        replyElement.remove();
        addBubble(
          "error",
          error instanceof Error ? error.message : String(error),
        );
      }
    };

    body
      .querySelector<HTMLButtonElement>(".ai-send")!
      .addEventListener("click", () => {
        void send();
      });
    input.addEventListener("keydown", (event) => {
      // Don't send while an IME composition is active (e.g. Enter to confirm).
      if (event.isComposing) return;
      if (!mention.hidden && mentionItems.length) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          mentionIndex = (mentionIndex + 1) % mentionItems.length;
          renderMention();
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          mentionIndex =
            (mentionIndex - 1 + mentionItems.length) % mentionItems.length;
          renderMention();
          return;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          chooseMention(mentionIndex);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          hideMention();
          return;
        }
      }
      if (matchAccelerator(event, deps.getSendAccelerator())) {
        event.preventDefault();
        void send();
      }
    });
  }

  async function renderTerminal(version: number): Promise<void> {
    terminalView?.destroy();
    terminalView = null;
    const settings = deps.getSettings();
    const entry =
      settings.terminals.find(
        (terminal) => terminal.id === settings.defaultTerminal,
      ) ?? settings.terminals[0];
    body.innerHTML = `
      <div class="ai-control-row ai-terminal-bar">
        <label>
          <span>Terminal</span>
          <select class="ai-terminal-select"></select>
        </label>
      </div>
      <div class="ai-terminal-host"></div>`;
    const select = body.querySelector<HTMLSelectElement>(".ai-terminal-select")!;
    for (const terminal of settings.terminals) {
      const option = document.createElement("option");
      option.value = terminal.id;
      option.textContent = terminal.label;
      option.selected = terminal.id === (entry?.id ?? "");
      select.appendChild(option);
    }
    select.addEventListener("change", () => {
      deps.onSettingsChange({
        ...deps.getSettings(),
        defaultTerminal: select.value,
      });
      render();
    });
    const host = body.querySelector<HTMLElement>(".ai-terminal-host")!;
    if (entry) {
      const { createTerminalView } = await import("./terminal");
      if (activeTab !== "terminal" || version !== renderVersion) return;
      terminalView = createTerminalView(host, entry.run, {
        fontFamily: settings.terminalFont,
        fontSize: settings.terminalFontSize,
      });
    } else {
      host.textContent =
        "No terminal configured. Add one in AI Settings.";
    }
  }

  function render(): void {
    renderVersion += 1;
    if (activeTab === "chat") renderChat();
    else void renderTerminal(renderVersion);
  }

  render();
  return {
    render,
    resize: () => terminalView?.resize(),
    addAttachments: (paths) => {
      if (activeTab !== "chat") {
        activeTab = "chat";
        tabs.forEach((tab) =>
          tab.classList.toggle("active", tab.dataset.tab === "chat"),
        );
        render();
      }
      addAttachments(paths);
    },
  };
}
