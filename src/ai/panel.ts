import type { AISettings, Provider } from "./aisettings";
import { streamChat } from "./client";
import { buildMessages } from "./conversation";
import { lineDiff } from "./diff";
import type { ChatMessage } from "./providers";

export type AIPanelDeps = {
  getSettings: () => AISettings;
  onSettingsChange: (settings: AISettings) => void;
  getDoc: () => { text: string; selection: string };
  onApply: (newText: string) => void;
  onInsert: (text: string) => void;
  onClose: () => void;
};

export type AIPanel = {
  render: () => void;
  resize: () => void;
};

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
        </div>
        <label class="ai-edit">
          <input type="checkbox" class="ai-editmode" ${
            editMode ? "checked" : ""
          } />
          Edit mode
        </label>
        <textarea class="ai-input" rows="3" placeholder="Ask about this document…"></textarea>
        <button class="ai-send" type="button">Send</button>
      </div>`;
    const messagesElement =
      body.querySelector<HTMLElement>(".ai-messages")!;
    const input = body.querySelector<HTMLTextAreaElement>(".ai-input")!;
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
      addBubble("user", prompt);
      const document = deps.getDoc();
      const messages = buildMessages({
        history,
        prompt,
        docText: document.text,
        selection: document.selection,
        editMode,
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
      if (
        event.key === "Enter" &&
        (event.metaKey || event.ctrlKey)
      ) {
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
    body.innerHTML = '<div class="ai-terminal-host"></div>';
    const host = body.querySelector<HTMLElement>(".ai-terminal-host")!;
    if (entry) {
      const { createTerminalView } = await import("./terminal");
      if (activeTab !== "terminal" || version !== renderVersion) return;
      terminalView = createTerminalView(host, entry.run);
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
  };
}
