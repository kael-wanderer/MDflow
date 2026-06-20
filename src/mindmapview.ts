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

type MindNode = { id: string; parent?: MindNode | null };

type JsMindInstance = {
  show: (mind: unknown) => void;
  get_data: (format: string) => unknown;
  add_event_listener: (fn: (...args: unknown[]) => void) => void;
  get_selected_node: () => MindNode | null;
  select_node: (node: MindNode) => void;
  begin_edit: (node: MindNode) => void;
  add_node: (parent: MindNode, id: string, topic: string) => MindNode | null;
  insert_node_after: (
    node: MindNode,
    id: string,
    topic: string,
  ) => MindNode | null;
  remove_node: (node: MindNode) => void;
  mind: { root: MindNode };
  view: {
    opts: { line_color: string };
    show_lines: () => void;
  };
  screenshot?: ScreenshotPlugin;
};

let canvasSeq = 0;

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

  host.replaceChildren();
  const wrap = document.createElement("div");
  wrap.className = "mm-wrap";
  const canvasId = `mm-canvas-${++canvasSeq}`;
  const canvas = document.createElement("div");
  canvas.id = canvasId;
  canvas.className = "mm-canvas";
  const bar = document.createElement("div");
  bar.className = "mm-toolbar";
  wrap.append(canvas, bar);
  host.append(wrap);

  const jm = new JsMind({
    container: canvasId,
    editable: true,
    mode: "full",
    view: {
      line_color: themeColor("--border", "#777"),
    },
  });
  jm.show(mind);

  let nodeSeq = 0;
  const newNodeId = (): string => `mm${Date.now()}${nodeSeq++}`;
  const addChild = (): void => {
    const parent = jm.get_selected_node() ?? jm.mind.root;
    const node = jm.add_node(parent, newNodeId(), "New node");
    if (node) {
      jm.select_node(node);
      jm.begin_edit(node);
    }
  };
  const addSibling = (): void => {
    const sel = jm.get_selected_node();
    if (!sel || !sel.parent) return addChild();
    const node = jm.insert_node_after(sel, newNodeId(), "New node");
    if (node) {
      jm.select_node(node);
      jm.begin_edit(node);
    }
  };
  const renameSelected = (): void => {
    const sel = jm.get_selected_node();
    if (sel) jm.begin_edit(sel);
  };
  const removeSelected = (): void => {
    const sel = jm.get_selected_node();
    if (sel && sel.parent) jm.remove_node(sel);
  };
  const makeButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mm-btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  };
  bar.append(
    makeButton("+ Child", addChild),
    makeButton("+ Sibling", addSibling),
    makeButton("Rename", renameSelected),
    makeButton("Delete", removeSelected),
  );
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
