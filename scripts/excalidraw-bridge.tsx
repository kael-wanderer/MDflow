import React from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export type BridgeOptions = {
  initialData: unknown;
  theme: "light" | "dark";
  onChange: (
    elements: readonly unknown[],
    appState: unknown,
    files: unknown,
  ) => void;
};

function mountExcalidraw(
  host: HTMLElement,
  options: BridgeOptions,
): () => void {
  const root = createRoot(host);
  root.render(
    <Excalidraw
      initialData={options.initialData as never}
      theme={options.theme}
      onChange={options.onChange as never}
    />,
  );
  return () => root.unmount();
}

(
  globalThis as typeof globalThis & {
    MDflowExcalidraw?: { mountExcalidraw: typeof mountExcalidraw };
  }
).MDflowExcalidraw = { mountExcalidraw };
