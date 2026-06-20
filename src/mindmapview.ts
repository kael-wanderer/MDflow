import { parseMindmap, serializeMindmap } from "./mindmap-document";
import {
  SHAPES,
  FILL_SWATCHES,
  TEXT_SWATCHES,
  clampFontSize,
  normalizeShape,
  readNodeStyle,
  type MindShape,
} from "./mindmap-style";

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

type MindNode = {
  id: string;
  parent?: MindNode | null;
  data?: Record<string, unknown>;
};

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
  get_node: (id: string) => MindNode | null;
  set_node_color: (id: string, bg: string | null, fg: string | null) => void;
  set_node_font_style: (
    id: string,
    size: number | null,
    weight: string | null,
    style?: string | null,
  ) => void;
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
  const nodeRow = document.createElement("div");
  nodeRow.className = "mm-row";
  const formatRow = document.createElement("div");
  formatRow.className = "mm-row mm-format";
  formatRow.hidden = true;
  bar.append(nodeRow, formatRow);
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

  const applyShapeClass = (id: string, shape: MindShape): void => {
    const el = canvas.querySelector(`jmnode[nodeid="${CSS.escape(id)}"]`);
    if (!el) return;
    for (const s of SHAPES) el.classList.toggle(`mm-shape-${s}`, s === shape);
  };
  const reapplyShapes = (): void => {
    for (const el of canvas.querySelectorAll<HTMLElement>("jmnode")) {
      const id = el.getAttribute("nodeid");
      if (!id) continue;
      const node = jm.get_node(id);
      applyShapeClass(id, normalizeShape(node?.data?.["mm-shape"]));
    }
  };
  reapplyShapes();

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
  nodeRow.append(
    makeButton("+ Child", addChild),
    makeButton("+ Sibling", addSibling),
    makeButton("Rename", renameSelected),
    makeButton("Delete", removeSelected),
  );
  const selectedNode = (): MindNode | null => jm.get_selected_node();

  const setShape = (shape: MindShape): void => {
    const node = selectedNode();
    if (!node) return;
    (node.data ??= {})["mm-shape"] = shape;
    applyShapeClass(node.id, shape);
    persist();
    updateFormatRow();
  };
  const setFill = (color: string): void => {
    const node = selectedNode();
    if (!node) return;
    jm.set_node_color(node.id, color, null);
    reapplyShapes();
    persist();
    updateFormatRow();
  };
  const setText = (color: string): void => {
    const node = selectedNode();
    if (!node) return;
    jm.set_node_color(node.id, null, color);
    reapplyShapes();
    persist();
    updateFormatRow();
  };
  const bumpSize = (delta: number): void => {
    const node = selectedNode();
    if (!node) return;
    const style = readNodeStyle(node.data);
    const size = clampFontSize(style.fontSize + delta);
    jm.set_node_font_style(node.id, size, style.bold ? "bold" : null);
    reapplyShapes();
    persist();
    updateFormatRow();
  };
  const toggleBold = (): void => {
    const node = selectedNode();
    if (!node) return;
    const style = readNodeStyle(node.data);
    jm.set_node_font_style(node.id, style.fontSize, style.bold ? null : "bold");
    reapplyShapes();
    persist();
    updateFormatRow();
  };

  const shapeButtons = SHAPES.map((shape) => {
    const button = makeButton(shape, () => setShape(shape));
    button.dataset.shape = shape;
    return button;
  });
  for (const button of shapeButtons) formatRow.appendChild(button);

  const fillInput = document.createElement("input");
  fillInput.type = "color";
  fillInput.className = "mm-color";
  fillInput.title = "Fill color";
  fillInput.addEventListener("input", () => setFill(fillInput.value));
  for (const color of FILL_SWATCHES) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "mm-swatch";
    swatch.style.background = color;
    swatch.title = `Fill ${color}`;
    swatch.addEventListener("click", () => setFill(color));
    formatRow.appendChild(swatch);
  }
  formatRow.appendChild(fillInput);

  const textInput = document.createElement("input");
  textInput.type = "color";
  textInput.className = "mm-color";
  textInput.title = "Text color";
  textInput.addEventListener("input", () => setText(textInput.value));
  for (const color of TEXT_SWATCHES) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "mm-swatch mm-swatch-text";
    swatch.style.background = color;
    swatch.title = `Text ${color}`;
    swatch.addEventListener("click", () => setText(color));
    formatRow.appendChild(swatch);
  }
  formatRow.appendChild(textInput);

  const sizeDown = makeButton("A-", () => bumpSize(-2));
  const sizeLabel = document.createElement("span");
  sizeLabel.className = "mm-size";
  const sizeUp = makeButton("A+", () => bumpSize(2));
  const boldButton = makeButton("B", toggleBold);
  boldButton.classList.add("mm-bold");
  formatRow.append(sizeDown, sizeLabel, sizeUp, boldButton);

  function updateFormatRow(): void {
    const node = selectedNode();
    if (!node) {
      formatRow.hidden = true;
      return;
    }
    formatRow.hidden = false;
    const style = readNodeStyle(node.data);
    for (const button of shapeButtons) {
      button.classList.toggle("active", button.dataset.shape === style.shape);
    }
    if (style.fill) fillInput.value = style.fill;
    if (style.text) textInput.value = style.text;
    sizeLabel.textContent = `${style.fontSize}px`;
    boldButton.classList.toggle("active", style.bold);
  }
  updateFormatRow();

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
  const persist = (): void => {
    const serialized = serializeMindmap(jm.get_data("node_tree"));
    if (serialized === last) return;
    last = serialized;
    onChange(serialized);
  };
  const listener = (): void => {
    reapplyShapes();
    updateFormatRow();
    if (accepting) persist();
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
