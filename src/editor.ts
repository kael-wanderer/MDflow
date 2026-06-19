import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

export type EditorHandle = {
  getDoc(): string;
  setDoc(text: string): void;
  setSoftWrap(on: boolean): void;
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
  { dark: true }
);

export function createEditor(parent: HTMLElement, onChange: (doc: string) => void): EditorHandle {
  const wrap = new Compartment();

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown({ codeLanguages: languages }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        wrap.of(EditorView.lineWrapping),
        theme,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    getDoc: () => view.state.doc.toString(),
    setDoc: (text) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    setSoftWrap: (on) =>
      view.dispatch({ effects: wrap.reconfigure(on ? EditorView.lineWrapping : []) }),
    focus: () => view.focus(),
  };
}
