// WebKit (Tauri's macOS webview) does not implement async iteration of
// ReadableStream, so PDF.js's `for await (const value of readableStream)` in
// getTextContent() throws "undefined is not a function". Install a reader-based
// async iterator when the runtime is missing one.

type StreamCtor = { prototype: object } | undefined;

export function installReadableStreamAsyncIterator(
  ctor: StreamCtor = globalThis.ReadableStream as unknown as StreamCtor,
): boolean {
  const proto = ctor?.prototype as
    | (Record<PropertyKey, unknown> & {
        getReader: () => {
          read: () => Promise<{ done: boolean; value: unknown }>;
          cancel: (reason?: unknown) => Promise<void>;
          releaseLock: () => void;
        };
      })
    | undefined;
  if (!proto || proto[Symbol.asyncIterator]) return false;

  const values = async function* (
    this: { getReader: (typeof proto)["getReader"] },
    { preventCancel = false }: { preventCancel?: boolean } = {},
  ): AsyncGenerator<unknown> {
    const reader = this.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      if (!preventCancel) await reader.cancel();
      reader.releaseLock();
    }
  };

  Object.defineProperty(proto, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: values,
  });
  Object.defineProperty(proto, "values", {
    configurable: true,
    writable: true,
    value: values,
  });
  return true;
}
