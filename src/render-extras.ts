let counter = 0;
const mermaidPromise = import("mermaid").then(({ default: mermaid }) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
  });
  return mermaid;
});

export function enhancePreview(container: HTMLElement): void {
  const blocks =
    container.querySelectorAll<HTMLElement>("code.language-mermaid");
  blocks.forEach((block) => {
    const code = block.textContent ?? "";
    const host = document.createElement("div");
    host.className = "mermaid-rendered";
    const pre = block.closest("pre");
    (pre ?? block).replaceWith(host);
    const id = `mmd-${counter++}`;
    void mermaidPromise
      .then((mermaid) => mermaid.render(id, code))
      .then(({ svg }) => {
        if (host.isConnected) host.innerHTML = svg;
      })
      .catch((error) => {
        host.textContent = `Mermaid error: ${String(error)}`;
        host.classList.add("mermaid-error");
      });
  });
}
