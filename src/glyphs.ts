const wrap = (inner: string): string =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const wrapFill = (inner: string): string =>
  `<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">${inner}</svg>`;

export const glyphs: Record<string, string> = {
  explorer: wrapFill(
    `<path d="M49.984,56l-35.989,0c-3.309,0-5.995,-2.686-5.995,-5.995l0,-36.011c0,-3.308 2.686,-5.995 5.995,-5.995l35.989,0c3.309,0 5.995,2.687 5.995,5.995l0,36.011c0,3.309-2.686,5.995-5.995,5.995Zm-25.984,-4.001l0,-39.999l-9.012,0c-1.65,0-2.989,1.339-2.989,2.989l0,34.021c0,1.65 1.339,2.989 2.989,2.989l9.012,0Zm24.991,-39.999l-20.991,0l0,39.999l20.991,0c1.65,0,2.989,-1.339,2.989,-2.989l0,-34.021c0,-1.65-1.339,-2.989-2.989,-2.989Z"/><path d="M19.999,38.774l-6.828,-6.828l6.828,-6.829l2.829,2.829l-4,4l4,4l-2.829,2.828Z"/>`,
  ),
  editor: wrap(`<path d="M10.5 2.5l3 3-8 8-3.5.5.5-3.5z"/>`),
  read: wrap(
    `<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/>`,
  ),
  split: wrap(`<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M8 3v10"/>`),
  lineNumbers: wrap(`<path d="M2.5 4h1.5M2.5 8h1.5M2.5 12h1.5M6.5 4h7M6.5 8h7M6.5 12h7"/>`),
  subToggle: wrap(
    `<rect x="1.5" y="3.5" width="6.5" height="9" rx="1.2"/><rect x="9.5" y="3.5" width="5" height="9" rx="1.2" stroke-dasharray="2 1.5"/>`,
  ),
  subClose: wrap(
    `<rect x="1.5" y="3.5" width="13" height="9" rx="1.2"/><path d="M10.5 5.8L8 8l2.5 2.2"/>`,
  ),
  newFile: wrap(
    `<path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/><path d="M8 8v4M6 10h4"/>`,
  ),
  newFolder: wrap(
    `<path d="M2 4h4l1.5 1.5H14V13H2z"/><path d="M8 8v3M6.5 9.5h3"/>`,
  ),
  collapseAll: wrap(`<path d="M5 6l3-2.5L11 6"/><path d="M5 10l3 2.5L11 10"/>`),
  expandAll: wrap(`<path d="M5 4l3 2.5L11 4"/><path d="M5 12l3-2.5L11 12"/>`),
  search: wrap(`<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3.5 3.5"/>`),
  gear: wrap(
    `<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>`,
  ),
};
