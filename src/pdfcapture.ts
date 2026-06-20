// Wrap a JPEG image into a minimal single-page PDF (no dependency).
// Used to export the rendered preview ("HTML") as a PDF the way it looks.
export function imageToPdf(
  jpeg: Uint8Array,
  pixelWidth: number,
  pixelHeight: number,
): Uint8Array {
  const latin1 = (text: string): Uint8Array =>
    Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);

  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];
  const push = (bytes: Uint8Array): void => {
    chunks.push(bytes);
    length += bytes.length;
  };
  const text = (value: string): void => push(latin1(value));
  const object = (index: number, body: string): void => {
    offsets[index] = length;
    text(body);
  };

  text("%PDF-1.3\n");
  object(1, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  object(2, "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  object(
    3,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pixelWidth} ${pixelHeight}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  offsets[4] = length;
  text(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  push(jpeg);
  text("\nendstream\nendobj\n");

  const content = `q ${pixelWidth} 0 0 ${pixelHeight} 0 0 cm /Im0 Do Q\n`;
  object(
    5,
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
  );

  const xrefOffset = length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let index = 1; index <= 5; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  text(xref);
  text(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}
