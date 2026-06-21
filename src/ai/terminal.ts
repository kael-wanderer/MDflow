import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

export function createTerminalView(
  host: HTMLElement,
  run: string,
  options: { fontFamily?: string; fontSize?: number } = {},
): { resize: () => void; destroy: () => void } {
  const id = `pty-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // xterm renders to canvas, so CSS vars won't resolve — read computed values.
  const css = getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string): string =>
    css.getPropertyValue(name).trim() || fallback;
  const terminal = new Terminal({
    fontFamily: options.fontFamily?.trim() || value("--font-mono", "monospace"),
    fontSize: options.fontSize && options.fontSize > 0 ? options.fontSize : 13,
    theme: {
      background: "#00000000",
      foreground: value("--text", "#ddd"),
      cursor: value("--accent", "#7aa2f7"),
      selectionBackground: value("--selection", "rgba(120,120,160,0.35)"),
    },
  });
  const fit = new FitAddon();
  const unlisteners: UnlistenFn[] = [];
  let destroyed = false;

  terminal.loadAddon(fit);
  terminal.open(host);
  fit.fit();

  void listen<{ id: string; data: string }>("pty-data", (event) => {
    if (event.payload.id === id && !destroyed) {
      terminal.write(event.payload.data);
    }
  }).then((unlisten) => {
    if (destroyed) unlisten();
    else unlisteners.push(unlisten);
  });

  const dataSubscription = terminal.onData((data) => {
    void invoke("pty_write", { id, data });
  });

  void invoke("pty_open", { id, cmd: run })
    .then(() => {
      if (!destroyed) {
        void invoke("pty_resize", {
          id,
          rows: terminal.rows,
          cols: terminal.cols,
        });
      }
    })
    .catch((error) => {
      if (!destroyed) {
        terminal.writeln(
          `\r\n[failed to start: ${
            error instanceof Error ? error.message : String(error)
          }]`,
        );
      }
    });

  return {
    resize: () => {
      if (destroyed) return;
      fit.fit();
      void invoke("pty_resize", {
        id,
        rows: terminal.rows,
        cols: terminal.cols,
      });
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      dataSubscription.dispose();
      unlisteners.splice(0).forEach((unlisten) => unlisten());
      void invoke("pty_kill", { id });
      terminal.dispose();
    },
  };
}
