import { parseMindmap, serializeMindmap } from "./mindmap-document";

export type MindmapHandle = {
  destroy: () => void;
  capture: () => Promise<HTMLCanvasElement>;
};

type JsMindModule = { default?: unknown } & Record<string, unknown>;

let modulePromise: Promise<unknown> | null = null;

async function loadJsMind(): Promise<unknown> {
  if (!modulePromise) {
    modulePromise = (async () => {
      await import("jsmind/style/jsmind.css");
      const mod = (await import("jsmind")) as JsMindModule;
      await import("jsmind/draggable-node");
      await import("jsmind/screenshot");
      return mod.default ?? mod;
    })();
  }
  return modulePromise;
}

type ScreenshotPlugin = {
  dpr: number;
  options: { background?: string };
  create_canvas: () => HTMLCanvasElement;
  draw_background: (ctx: CanvasRenderingContext2D) => Promise<CanvasRenderingContext2D>;
  draw_lines: (ctx: CanvasRenderingContext2D) => Promise<CanvasRenderingContext2D>;
  draw_nodes: (ctx: CanvasRenderingContext2D) => Promise<CanvasRenderingContext2D>;
  clear: (c: HTMLCanvasElement) => void;
};

type JsMindInstance = {
  show: (mind: unknown) => void;
  get_data: (format: string) => unknown;
  add_event_listener: (fn: (...args: unknown[]) => void) => void;
  view: {
    opts: { line_color: string };
    show_lines: () => void;
  };
  screenshot?: ScreenshotPlugin;
};

function themeColor(name: string, fallback: string): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() || fallback
  );
}

export async function mountMindmapBoard(
  host: HTMLElement,
  raw: string,
  onChange: (serialized: string) => void,
): Promise<MindmapHandle> {
  const mind = parseMindmap(raw);
  const JsMind = (await loadJsMind()) as new (options: unknown) => JsMindInstance;

  const jm = new JsMind({
    container: host,
    editable: true,
    mode: "full",
    view: {
      line_color: themeColor("--border", "#777"),
    },
  });
  jm.show(mind);
  const themeObserver = new MutationObserver(() => {
    jm.view.opts.line_color = themeColor("--border", "#777");
    jm.view.show_lines();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  let accepting = false;
  let last = serializeMindmap(jm.get_data("node_tree"));
  const timer = window.setTimeout(() => {
    accepting = true;
  }, 250);
  const listener = (): void => {
    if (!accepting) return;
    const serialized = serializeMindmap(jm.get_data("node_tree"));
    if (serialized === last) return;
    last = serialized;
    onChange(serialized);
  };
  jm.add_event_listener(listener);

  return {
    destroy: () => {
      window.clearTimeout(timer);
      themeObserver.disconnect();
      host.replaceChildren();
    },
    capture: async () => {
      const ss = jm.screenshot;
      if (!ss) throw new Error("Mindmap export is unavailable.");
      ss.options.background = "#ffffff";
      const canvas = ss.create_canvas();
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas rendering is unavailable");
      ctx.scale(ss.dpr, ss.dpr);
      await ss.draw_background(ctx);
      await ss.draw_lines(ctx);
      await ss.draw_nodes(ctx);
      ss.clear(canvas);
      return canvas;
    },
  };
}
