let counter = 0;
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid(): Promise<typeof import("mermaid").default> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

export function enhancePreview(container: HTMLElement): void {
  const blocks =
    container.querySelectorAll<HTMLElement>("code.language-mermaid");
  if (blocks.length === 0) return;

  void loadMermaid().then((mermaid) => {
    blocks.forEach((block) => {
      if (!block.isConnected) return;
      const code = block.textContent ?? "";
      const host = document.createElement("div");
      host.className = "mermaid-rendered";
      const pre = block.closest("pre");
      (pre ?? block).replaceWith(host);
      const id = `mmd-${counter++}`;
      void mermaid
        .render(id, code)
        .then(({ svg }) => {
          if (host.isConnected) host.innerHTML = svg;
        })
        .catch((error) => {
          host.textContent = `Mermaid error: ${String(error)}`;
          host.classList.add("mermaid-error");
        });
    });
  });
}
