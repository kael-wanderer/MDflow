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
  zoomBy: (delta: number) => void;
  resetZoom: () => void;
};

type JsMindModule = { default?: unknown } & Record<string, unknown>;

let modulePromise: Promise<unknown> | null = null;

async function loadJsMind(): Promise<unknown> {
  if (!modulePromise) {
    modulePromise = (async () => {
      await import("jsmind/style/jsmind.css");
      const mod = (await import("jsmind")) as JsMindModule;
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
  direction?: number;
  isroot?: boolean;
  children?: MindNode[];
  data?: Record<string, unknown>;
  _data?: {
    view?: {
      width: number;
      height: number;
    };
  };
};

type Point = { x: number; y: number };

type JsMindInstance = {
  show: (mind: unknown) => void;
  get_data: (format: string) => unknown;
  add_event_listener: (fn: (...args: unknown[]) => void) => void;
  get_selected_node: () => MindNode | null;
  select_node: (node: MindNode) => void;
  begin_edit: (node: MindNode) => void;
  add_node: (
    parent: MindNode,
    id: string,
    topic: string,
    data?: Record<string, unknown>,
  ) => MindNode | null;
  insert_node_after: (
    node: MindNode,
    id: string,
    topic: string,
    data?: Record<string, unknown>,
  ) => MindNode | null;
  remove_node: (node: MindNode) => void;
  move_node: (
    nodeId: string,
    beforeId: string,
    parentId: string,
    direction?: number,
  ) => void;
  get_node: (id: string) => MindNode | null;
  set_node_color: (id: string, bg: string | null, fg: string | null) => void;
  set_node_font_style: (
    id: string,
    size: number | null,
    weight: string | null,
    style?: string | null,
  ) => void;
  mind: { root: MindNode; nodes: Record<string, MindNode> };
  layout: {
    is_visible: (node: MindNode) => boolean;
    get_node_offset: (node: MindNode) => Point;
    get_node_point_in: (node: MindNode) => Point;
    get_node_point_out: (node: MindNode) => Point;
  };
  view: {
    opts: { line_color: string };
    zoom_current: number;
    zoom_in: () => boolean;
    zoom_out: () => boolean;
    set_zoom: (zoom: number) => boolean;
    show_lines: () => void;
    clear_lines: () => void;
    get_view_offset: () => Point;
    graph: {
      draw_line: (
        start: Point,
        end: Point,
        offset: Point,
        color?: unknown,
      ) => void;
    };
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
  onOpen: () => void = () => {},
  onSave: () => void = () => {},
  onReset: () => void = () => {},
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
      line_color: themeColor("--muted", "#777"),
    },
  });
  jm.show(mind);

  const drawBorderAwareLines = (): void => {
    jm.view.clear_lines();
    const offset = jm.view.get_view_offset();
    for (const node of Object.values(jm.mind.nodes)) {
      if (node.isroot || !node.parent || !jm.layout.is_visible(node)) continue;
      const end = jm.layout.get_node_point_in(node);
      let start = jm.layout.get_node_point_out(node.parent);
      if (node.parent.isroot) {
        const rootCenter = jm.layout.get_node_offset(node.parent);
        const rootWidth = node.parent._data?.view?.width ?? 0;
        const direction = node.direction === -1 ? -1 : 1;
        start = {
          x: rootCenter.x + (rootWidth / 2) * direction,
          y: rootCenter.y,
        };
      }
      jm.view.graph.draw_line(
        start,
        end,
        offset,
        node.data?.["leading-line-color"],
      );
    }
  };
  jm.view.show_lines = drawBorderAwareLines;
  drawBorderAwareLines();

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
  const defaultNodeData = (): Record<string, unknown> => ({
    "mm-shape": "none",
  });
  const addChild = (): void => {
    const parent = jm.get_selected_node() ?? jm.mind.root;
    const node = jm.add_node(
      parent,
      newNodeId(),
      "New node",
      defaultNodeData(),
    );
    if (node) {
      jm.select_node(node);
      jm.begin_edit(node);
    }
  };
  const addSibling = (): void => {
    const sel = jm.get_selected_node();
    if (!sel || !sel.parent) return addChild();
    const node = jm.insert_node_after(
      sel,
      newNodeId(),
      "New node",
      defaultNodeData(),
    );
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
  const docActions = document.createElement("span");
  docActions.className = "mm-doc-actions";
  docActions.append(
    makeButton("Open", onOpen),
    makeButton("Save", onSave),
    makeButton("Reset", onReset),
  );
  nodeRow.append(
    makeButton("+ Child", addChild),
    makeButton("+ Sibling", addSibling),
    makeButton("Rename", renameSelected),
    makeButton("Delete", removeSelected),
    docActions,
  );
  const zoomActions = document.createElement("span");
  zoomActions.className = "mm-zoom-actions";
  const zoomLabel = document.createElement("span");
  zoomLabel.className = "mm-zoom-label";
  const updateZoomLabel = (): void => {
    zoomLabel.textContent = `${Math.round(jm.view.zoom_current * 100)}%`;
  };
  const zoomBy = (delta: number): void => {
    if (delta > 0) jm.view.zoom_in();
    else jm.view.zoom_out();
    updateZoomLabel();
  };
  zoomActions.append(
    makeButton("−", () => zoomBy(-0.1)),
    zoomLabel,
    makeButton("+", () => zoomBy(0.1)),
  );
  nodeRow.appendChild(zoomActions);
  updateZoomLabel();
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
    jm.view.opts.line_color = themeColor("--muted", "#777");
    drawBorderAwareLines();
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
    drawBorderAwareLines();
    updateFormatRow();
    if (accepting) persist();
  };
  jm.add_event_listener(listener);

  let drag:
    | {
        node: MindNode;
        element: HTMLElement;
        startX: number;
        startY: number;
        active: boolean;
        ghost: HTMLElement | null;
      }
    | null = null;

  const finishDrag = (event: MouseEvent): void => {
    if (!drag) return;
    const current = drag;
    drag = null;
    current.element.classList.remove("mm-drag-source");
    current.ghost?.remove();
    document.body.classList.remove("mm-node-dragging");
    document.removeEventListener("mousemove", moveDrag);
    document.removeEventListener("mouseup", finishDrag);
    if (!current.active) return;

    const targetElement = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find(
        (element) =>
          element instanceof HTMLElement &&
          element.tagName === "JMNODE" &&
          !element.classList.contains("jsmind-draggable-shadow-node") &&
          element !== current.element,
      ) as HTMLElement | undefined;
    const targetId = targetElement?.getAttribute("nodeid");
    const target = targetId ? jm.get_node(targetId) : jm.mind.root;
    if (!target) return;

    const rootRect = canvas
      .querySelector<HTMLElement>(
        `jmnode[nodeid="${CSS.escape(jm.mind.root.id)}"]`,
      )
      ?.getBoundingClientRect();
    const direction =
      event.clientX < (rootRect?.left ?? 0) + (rootRect?.width ?? 0) / 2
        ? -1
        : 1;
    jm.move_node(
      current.node.id,
      "_last_",
      target.id,
      target.isroot ? direction : target.direction,
    );
  };

  const moveDrag = (event: MouseEvent): void => {
    if (!drag) return;
    const distance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );
    if (!drag.active && distance >= 4) {
      drag.active = true;
      drag.element.classList.add("mm-drag-source");
      document.body.classList.add("mm-node-dragging");
      const ghost = drag.element.cloneNode(true) as HTMLElement;
      ghost.className = `${drag.element.className} mm-drag-ghost`;
      document.body.appendChild(ghost);
      drag.ghost = ghost;
    }
    if (!drag.active || !drag.ghost) return;
    event.preventDefault();
    drag.ghost.style.left = `${event.clientX + 12}px`;
    drag.ghost.style.top = `${event.clientY + 12}px`;
  };

  const beginDrag = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      "jmnode",
    );
    if (
      !element ||
      element.classList.contains("root") ||
      element.classList.contains("jsmind-draggable-shadow-node")
    ) {
      return;
    }
    const id = element.getAttribute("nodeid");
    const node = id ? jm.get_node(id) : null;
    if (!node) return;
    drag = {
      node,
      element,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      ghost: null,
    };
    document.addEventListener("mousemove", moveDrag);
    document.addEventListener("mouseup", finishDrag);
  };
  canvas.addEventListener("mousedown", beginDrag, true);

  return {
    destroy: () => {
      window.clearTimeout(timer);
      themeObserver.disconnect();
      canvas.removeEventListener("mousedown", beginDrag, true);
      document.removeEventListener("mousemove", moveDrag);
      document.removeEventListener("mouseup", finishDrag);
      drag?.ghost?.remove();
      document.body.classList.remove("mm-node-dragging");
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
    zoomBy,
    resetZoom: () => {
      jm.view.set_zoom(1);
      updateZoomLabel();
    },
  };
}
