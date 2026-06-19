import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";

export type EditorHandle = {
  openState(id: string, text: string): void;
  switchTo(id: string): void;
  closeState(id: string): void;
  getText(id: string): string;
  setSoftWrap(on: boolean): void;
  setLineNumbers(on: boolean): void;
  focus(): void;
};

const theme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent", color: "var(--text)" },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      fontSize: "calc(13.5px * var(--zoom, 1))",
      lineHeight: "1.65",
      padding: "var(--pane-pad) 0",
    },
    ".cm-content": { caretColor: "var(--accent)", paddingRight: "var(--pane-pad)" },
    ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "8px", paddingRight: "12px" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "var(--accent)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--selection)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--faint)",
      border: "none",
      paddingLeft: "12px",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.025)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--muted)" },
  },
  { dark: true },
);

const wrap = new Compartment();
const gutter = new Compartment();

export function createEditor(
  parent: HTMLElement,
  onChange: (id: string, text: string) => void,
): EditorHandle {
  const states = new Map<string, EditorState>();
  let activeId: string | null = null;
  let softWrap = true;
  let lineNums = true;

  const baseExtensions = (id: string): Extension[] => [
    gutter.of(lineNums ? lineNumbers() : []),
    history(),
    drawSelection(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    markdown({ codeLanguages: languages }),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    wrap.of(softWrap ? EditorView.lineWrapping : []),
    theme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(id, update.state.doc.toString());
    }),
  ];

  const view = new EditorView({
    parent,
    state: EditorState.create({ doc: "", extensions: baseExtensions("") }),
  });

  const reapplyToggles = (): void => {
    view.dispatch({
      effects: [
        wrap.reconfigure(softWrap ? EditorView.lineWrapping : []),
        gutter.reconfigure(lineNums ? lineNumbers() : []),
      ],
    });
  };

  const handle: EditorHandle = {
    openState(id, text) {
      states.set(id, EditorState.create({ doc: text, extensions: baseExtensions(id) }));
      handle.switchTo(id);
    },
    switchTo(id) {
      if (activeId && states.has(activeId)) {
        states.set(activeId, view.state);
      }
      const target = states.get(id);
      if (!target) return;
      activeId = id;
      view.setState(target);
      reapplyToggles();
    },
    closeState(id) {
      states.delete(id);
      if (activeId === id) activeId = null;
    },
    getText(id) {
      if (id === activeId) return view.state.doc.toString();
      return states.get(id)?.doc.toString() ?? "";
    },
    setSoftWrap(on) {
      softWrap = on;
      reapplyToggles();
    },
    setLineNumbers(on) {
      lineNums = on;
      reapplyToggles();
    },
    focus() {
      view.focus();
    },
  };

  return handle;
}
