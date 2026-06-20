import type { AISettings, Provider } from "./ai/aisettings";
import {
  normalizeThemeName,
  THEME_OPTIONS,
  type Settings,
  type ZoneSettings,
} from "./settings";

type SettingsTab = "theme" | "format" | "general" | "agent";
type ZoneName = "explorer" | "main" | "sub";
type AgentGroup = "command" | "local" | "api";

export type SettingsPanelDeps = {
  getSettings: () => Settings;
  getAISettings: () => AISettings;
  onSettingsChange: (settings: Settings) => void;
  onAISettingsChange: (settings: AISettings) => void;
  onOpenSettingsFile: () => void;
  onOpenAISettingsFile: () => void;
  onCheckForUpdates: () => void;
};

export type SettingsPanel = {
  open: (x: number, y: number) => void;
  close: () => void;
};

const FONT_OPTIONS = [
  { label: "System", value: "" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "JetBrains Mono", value: "JetBrains Mono" },
  { label: "Iosevka Nerd Font Mono", value: "Iosevka Nerd Font Mono" },
] as const;
const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24] as const;

function cloneSettings(settings: Settings): Settings {
  return {
    ...settings,
    explorer: { ...settings.explorer },
    main: { ...settings.main },
    sub: { ...settings.sub },
  };
}

function cloneAISettings(settings: AISettings): AISettings {
  return {
    ...settings,
    providers: settings.providers.map((provider) => ({ ...provider })),
    terminals: settings.terminals.map((terminal) => ({ ...terminal })),
  };
}

function isLocalHttp(provider: Provider): boolean {
  if (provider.type !== "http") return false;
  try {
    const hostname = new URL(provider.baseUrl).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function providerGroup(provider: Provider): AgentGroup {
  if (provider.type === "command") return "command";
  return isLocalHttp(provider) ? "local" : "api";
}

function uniqueId(label: string, settings: AISettings): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "provider";
  let id = base;
  let suffix = 2;
  while (settings.providers.some((provider) => provider.id === id)) {
    id = `${base}-${suffix++}`;
  }
  return id;
}

export function createSettingsPanel(deps: SettingsPanelDeps): SettingsPanel {
  const panel = document.createElement("section");
  panel.className = "settings-panel hidden";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Settings");
  document.body.appendChild(panel);

  let activeTab: SettingsTab = "theme";
  let activeZone: ZoneName = "main";
  let activeAgentGroup: AgentGroup = "command";

  function updateSettings(
    update: (settings: Settings) => void,
  ): void {
    const settings = cloneSettings(deps.getSettings());
    update(settings);
    deps.onSettingsChange(settings);
    render();
  }

  function updateAI(update: (settings: AISettings) => void): void {
    const settings = cloneAISettings(deps.getAISettings());
    update(settings);
    deps.onAISettingsChange(settings);
    render();
  }

  function zoneSettings(settings: Settings): ZoneSettings {
    return settings[activeZone];
  }

  function renderChoiceList(
    choices: Array<{ label: string; selected: boolean; run: () => void }>,
  ): HTMLElement {
    const list = document.createElement("div");
    list.className = "settings-choice-list";
    for (const choice of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `settings-choice${choice.selected ? " selected" : ""}`;
      button.innerHTML = `<span></span><span class="settings-check">${
        choice.selected ? "✓" : ""
      }</span>`;
      button.firstElementChild!.textContent = choice.label;
      button.addEventListener("click", choice.run);
      list.appendChild(button);
    }
    return list;
  }

  function renderCustomInput(
    label: string,
    value: string,
    placeholder: string,
    submit: (value: string, error: HTMLElement) => boolean,
  ): HTMLElement {
    const form = document.createElement("form");
    form.className = "settings-custom";
    form.innerHTML = `
      <label>${label}</label>
      <div class="settings-input-row">
        <input type="text" value="" placeholder="${placeholder}" />
        <button type="submit">Apply</button>
      </div>
      <div class="settings-error" role="status"></div>`;
    const input = form.querySelector<HTMLInputElement>("input")!;
    const error = form.querySelector<HTMLElement>(".settings-error")!;
    input.value = value;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (submit(input.value.trim(), error)) input.blur();
    });
    return form;
  }

  function renderTheme(content: HTMLElement): void {
    const settings = deps.getSettings();
    content.appendChild(
      renderChoiceList(
        THEME_OPTIONS.map((theme) => ({
          label: theme.label,
          selected: settings.theme === theme.id,
          run: () =>
            updateSettings((next) => {
              next.theme = theme.id;
            }),
        })),
      ),
    );
    content.appendChild(
      renderCustomInput(
        "Custom theme name",
        THEME_OPTIONS.find((option) => option.id === settings.theme)?.label ?? "",
        "Everforest Dark",
        (value, error) => {
          const theme = normalizeThemeName(value);
          if (!theme) {
            error.textContent = "Use one of the installed theme names.";
            return false;
          }
          error.textContent = "";
          updateSettings((next) => {
            next.theme = theme;
          });
          return true;
        },
      ),
    );
  }

  function renderZoneTabs(content: HTMLElement): void {
    const row = document.createElement("div");
    row.className = "settings-segment";
    for (const zone of ["explorer", "main", "sub"] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("active", activeZone === zone);
      button.textContent =
        zone === "main" ? "Main" : zone === "sub" ? "Sub" : "Explorer";
      button.addEventListener("click", () => {
        activeZone = zone;
        render();
      });
      row.appendChild(button);
    }
    content.appendChild(row);
  }

  function renderSubhead(content: HTMLElement, text: string): void {
    const head = document.createElement("h4");
    head.className = "settings-subhead";
    head.textContent = text;
    content.appendChild(head);
  }

  function renderFontControls(content: HTMLElement): void {
    const settings = deps.getSettings();
    const current = zoneSettings(settings).font;
    content.appendChild(
      renderChoiceList(
        FONT_OPTIONS.map((font) => ({
          label: font.label,
          selected: current === font.value,
          run: () =>
            updateSettings((next) => {
              next[activeZone].font = font.value;
            }),
        })),
      ),
    );
    content.appendChild(
      renderCustomInput(
        "Custom font family",
        current,
        "Iosevka Nerd Font Mono",
        (value, error) => {
          if (!value) {
            error.textContent = "Enter an installed font family.";
            return false;
          }
          error.textContent = "";
          updateSettings((next) => {
            next[activeZone].font = value;
          });
          return true;
        },
      ),
    );
  }

  function renderSizeControls(content: HTMLElement): void {
    const current = zoneSettings(deps.getSettings()).size;
    content.appendChild(
      renderChoiceList(
        SIZE_OPTIONS.map((size) => ({
          label: `${size}px`,
          selected: current === size,
          run: () =>
            updateSettings((next) => {
              next[activeZone].size = size;
            }),
        })),
      ),
    );
    content.appendChild(
      renderCustomInput(
        "Custom size",
        String(current),
        "18",
        (value, error) => {
          const size = Number(value);
          if (!Number.isFinite(size) || size < 10 || size > 28) {
            error.textContent = "Choose a size from 10 to 28.";
            return false;
          }
          error.textContent = "";
          updateSettings((next) => {
            next[activeZone].size = Math.round(size);
          });
          return true;
        },
      ),
    );
  }

  function renderFormat(content: HTMLElement): void {
    renderZoneTabs(content);
    renderSubhead(content, "Font");
    renderFontControls(content);
    renderSubhead(content, "Size");
    renderSizeControls(content);
  }

  function renderGeneral(content: HTMLElement): void {
    const settings = deps.getSettings();
    const session = document.createElement("label");
    session.className = "settings-toggle";
    session.innerHTML = `
      <input type="checkbox" ${settings.restoreSession ? "checked" : ""} />
      <span>
        <strong>Restore last session</strong>
        <small>Reopen the last folder, tabs, and active document.</small>
      </span>`;
    session.querySelector("input")!.addEventListener("change", (event) => {
      updateSettings((next) => {
        next.restoreSession = (event.target as HTMLInputElement).checked;
      });
    });
    content.appendChild(session);

    renderSubhead(content, "Updates");
    const label = document.createElement("label");
    label.className = "settings-toggle";
    label.innerHTML = `
      <input type="checkbox" ${settings.autoUpdate ? "checked" : ""} />
      <span>
        <strong>Automatically check for updates</strong>
        <small>Check once per day. MDflow always asks before downloading and installing.</small>
      </span>`;
    label.querySelector("input")!.addEventListener("change", (event) => {
      updateSettings((next) => {
        next.autoUpdate = (event.target as HTMLInputElement).checked;
      });
    });
    content.appendChild(label);

    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.className = "settings-check-update";
    checkButton.textContent = "Check for Updates";
    checkButton.addEventListener("click", deps.onCheckForUpdates);
    content.appendChild(checkButton);
  }

  function renderAgentEditor(content: HTMLElement): void {
    const settings = deps.getAISettings();
    const providers = settings.providers.filter(
      (provider) => providerGroup(provider) === activeAgentGroup,
    );
    const list = document.createElement("div");
    list.className = "agent-list";
    for (const provider of providers) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `agent-row${
        settings.defaultProvider === provider.id ? " selected" : ""
      }`;
      const detail =
        provider.type === "command"
          ? provider.run.split(/\s+/)[0]
          : `${provider.model} at ${provider.baseUrl}`;
      row.innerHTML = `<span><strong></strong><small></small></span><span></span>`;
      row.querySelector("strong")!.textContent = provider.label;
      row.querySelector("small")!.textContent = detail;
      row.lastElementChild!.textContent =
        settings.defaultProvider === provider.id ? "Selected" : "Use";
      row.addEventListener("click", () =>
        updateAI((next) => {
          next.defaultProvider = provider.id;
        }),
      );
      list.appendChild(row);
    }
    if (!providers.length) {
      const empty = document.createElement("p");
      empty.className = "settings-empty";
      empty.textContent = "No providers configured in this section.";
      list.appendChild(empty);
    }
    content.appendChild(list);

    const form = document.createElement("form");
    form.className = "agent-form";
    if (activeAgentGroup === "command") {
      form.innerHTML = `
        <label>Name<input name="label" placeholder="Claude Code" required /></label>
        <label>Command<input name="run" placeholder="claude -p {prompt}" required /></label>
        <label>Bypass command<input name="bypass" placeholder="Optional command for bypass mode" /></label>
        <button type="submit">Add local agent</button>`;
    } else {
      form.innerHTML = `
        <label>Name<input name="label" placeholder="${
          activeAgentGroup === "local" ? "Ollama" : "OpenAI"
        }" required /></label>
        <label>Base URL<input name="base" placeholder="${
          activeAgentGroup === "local"
            ? "http://localhost:11434/v1"
            : "https://api.openai.com/v1"
        }" required /></label>
        <label>Model ID<input name="model" placeholder="Model name" required /></label>
        <label>API key<input name="key" type="password" placeholder="Optional" /></label>
        <button type="submit">Add ${
          activeAgentGroup === "local" ? "local model" : "API model"
        }</button>`;
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const label = String(data.get("label") ?? "").trim();
      if (!label) return;
      updateAI((next) => {
        const id = uniqueId(label, next);
        const provider: Provider =
          activeAgentGroup === "command"
            ? {
                id,
                label,
                type: "command",
                run: String(data.get("run") ?? "").trim(),
                bypassRun:
                  String(data.get("bypass") ?? "").trim() || undefined,
              }
            : {
                id,
                label,
                type: "http",
                baseUrl: String(data.get("base") ?? "").trim(),
                model: String(data.get("model") ?? "").trim(),
                key: String(data.get("key") ?? "").trim(),
              };
        next.providers.push(provider);
        next.defaultProvider = id;
      });
    });
    content.appendChild(form);
  }

  function renderAgent(content: HTMLElement): void {
    const groups: Array<[AgentGroup, string]> = [
      ["command", "Local agent"],
      ["local", "Local model"],
      ["api", "API model"],
    ];
    const row = document.createElement("div");
    row.className = "settings-segment agent-segment";
    for (const [id, label] of groups) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("active", activeAgentGroup === id);
      button.textContent = label;
      button.addEventListener("click", () => {
        activeAgentGroup = id;
        render();
      });
      row.appendChild(button);
    }
    content.appendChild(row);
    renderAgentEditor(content);
  }

  function render(): void {
    const tabs: Array<[SettingsTab, string]> = [
      ["theme", "Theme"],
      ["format", "Format"],
      ["general", "General"],
      ["agent", "Agent"],
    ];
    panel.innerHTML = `
      <header class="settings-header">
        <strong>${
          activeTab === "agent"
            ? "Agents"
            : activeTab === "general"
              ? "General"
              : "Appearance"
        }</strong>
        <button class="settings-close" type="button" aria-label="Close settings">×</button>
      </header>
      <nav class="settings-tabs" aria-label="Settings sections"></nav>
      <div class="settings-content"></div>
      <footer class="settings-footer">
        <button type="button" data-raw="settings">Open settings.json</button>
        <button type="button" data-raw="ai">Open ai.json</button>
      </footer>`;
    const nav = panel.querySelector<HTMLElement>(".settings-tabs")!;
    for (const [id, label] of tabs) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("active", activeTab === id);
      button.textContent = label;
      button.addEventListener("click", () => {
        activeTab = id;
        render();
      });
      nav.appendChild(button);
    }
    panel
      .querySelector(".settings-close")!
      .addEventListener("click", close);
    panel
      .querySelector('[data-raw="settings"]')!
      .addEventListener("click", () => {
        close();
        deps.onOpenSettingsFile();
      });
    panel
      .querySelector('[data-raw="ai"]')!
      .addEventListener("click", () => {
        close();
        deps.onOpenAISettingsFile();
      });

    const content = panel.querySelector<HTMLElement>(".settings-content")!;
    if (activeTab === "theme") renderTheme(content);
    else if (activeTab === "format") renderFormat(content);
    else if (activeTab === "general") renderGeneral(content);
    else renderAgent(content);
  }

  function close(): void {
    panel.classList.add("hidden");
  }

  document.addEventListener("mousedown", (event) => {
    if (
      !panel.classList.contains("hidden") &&
      event.target instanceof Node &&
      !panel.contains(event.target) &&
      !document.getElementById("ab-settings")?.contains(event.target)
    ) {
      close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  return {
    open: (x, y) => {
      render();
      panel.classList.remove("hidden");
      const width = 440;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, x));
      panel.style.left = `${left}px`;
      panel.style.bottom = `${Math.max(8, window.innerHeight - y - 36)}px`;
    },
    close,
  };
}
