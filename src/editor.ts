import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import {
  applyMarkdownFormat,
  type MarkdownFormat,
} from "./markdown-format";

export type EditorDocumentKind = "markdown" | "html" | "plain";

export type EditorHandle = {
  openState(id: string, text: string, kind?: EditorDocumentKind): void;
  switchTo(id: string): void;
  closeState(id: string): void;
  setDocumentKind(id: string, kind: EditorDocumentKind): void;
  applyMarkdownFormat(format: MarkdownFormat): void;
  getText(id: string): string;
  getSelection(): { from: number; to: number; text: string };
  replaceRange(from: number, to: number, text: string): void;
  setText(text: string): void;
  setSoftWrap(on: boolean): void;
  setLineNumbers(on: boolean): void;
  requestMeasure(): void;
  focus(): void;
};

const theme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent", color: "var(--text)" },
    ".cm-scroller": {
      fontFamily: "var(--win-font, var(--font-mono))",
      fontSize: "calc(var(--win-size, 15px) * var(--editor-zoom, 1))",
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

const mdHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "var(--tok-func)", fontWeight: "bold" },
  { tag: [tags.keyword, tags.modifier], color: "var(--tok-keyword)" },
  { tag: [tags.string, tags.link, tags.url], color: "var(--tok-string)" },
  {
    tag: [tags.comment, tags.quote],
    color: "var(--tok-comment)",
    fontStyle: "italic",
  },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.monospace, color: "var(--tok-string)" },
]);

const wrap = new Compartment();
const gutter = new Compartment();
const language = new Compartment();

function languageExtension(kind: EditorDocumentKind): Extension {
  if (kind === "html") return html({ autoCloseTags: true });
  if (kind === "plain") return [];
  return markdown({ codeLanguages: languages });
}

export function createEditor(
  parent: HTMLElement,
  onChange: (id: string, text: string) => void,
): EditorHandle {
  const states = new Map<string, EditorState>();
  let activeId: string | null = null;
  let softWrap = true;
  let lineNums = true;

  const baseExtensions = (
    id: string,
    kind: EditorDocumentKind = "markdown",
  ): Extension[] => [
    gutter.of(lineNums ? lineNumbers() : []),
    history(),
    drawSelection(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    language.of(languageExtension(kind)),
    syntaxHighlighting(mdHighlight, { fallback: true }),
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
    openState(id, text, kind = "markdown") {
      states.set(
        id,
        EditorState.create({ doc: text, extensions: baseExtensions(id, kind) }),
      );
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
      if (activeId === id) {
        activeId = null;
        view.setState(EditorState.create({ doc: "", extensions: baseExtensions("") }));
        reapplyToggles();
      }
    },
    setDocumentKind(id, kind) {
      if (id === activeId) {
        view.dispatch({
          effects: language.reconfigure(languageExtension(kind)),
        });
        return;
      }
      const state = states.get(id);
      if (!state) return;
      states.set(
        id,
        state.update({
          effects: language.reconfigure(languageExtension(kind)),
        }).state,
      );
    },
    applyMarkdownFormat(format) {
      if (!activeId) return;
      const selection = view.state.selection.main;
      const result = applyMarkdownFormat(
        view.state.doc.toString(),
        selection.from,
        selection.to,
        format,
      );
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: result.text,
        },
        selection: { anchor: result.anchor, head: result.head },
        scrollIntoView: true,
      });
      view.focus();
    },
    getText(id) {
      if (id === activeId) return view.state.doc.toString();
      return states.get(id)?.doc.toString() ?? "";
    },
    getSelection() {
      const selection = view.state.selection.main;
      return {
        from: selection.from,
        to: selection.to,
        text: view.state.sliceDoc(selection.from, selection.to),
      };
    },
    replaceRange(from, to, text) {
      view.dispatch({ changes: { from, to, insert: text } });
    },
    setText(text) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    },
    setSoftWrap(on) {
      softWrap = on;
      reapplyToggles();
    },
    setLineNumbers(on) {
      lineNums = on;
      reapplyToggles();
    },
    requestMeasure() {
      view.requestMeasure();
    },
    focus() {
      view.focus();
    },
  };

  return handle;
}
