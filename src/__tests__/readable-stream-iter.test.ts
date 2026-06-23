import { describe, expect, it } from "vitest";
import { installReadableStreamAsyncIterator } from "../readable-stream-iter";

function fakeStreamClass(chunks: unknown[]) {
  return class FakeStream {
    getReader() {
      let index = 0;
      return {
        read: () =>
          Promise.resolve(
            index < chunks.length
              ? { done: false, value: chunks[index++] }
              : { done: true, value: undefined },
          ),
        cancel: () => Promise.resolve(),
        releaseLock: () => {},
      };
    }
  };
}

describe("installReadableStreamAsyncIterator", () => {
  it("installs async iteration when the prototype lacks it", async () => {
    const FakeStream = fakeStreamClass([1, 2, 3]);
    expect(
      (FakeStream.prototype as unknown as Record<symbol, unknown>)[
        Symbol.asyncIterator
      ],
    ).toBeUndefined();

    const installed = installReadableStreamAsyncIterator(FakeStream);
    expect(installed).toBe(true);

    const collected: unknown[] = [];
    for await (const value of new FakeStream() as unknown as AsyncIterable<unknown>) {
      collected.push(value);
    }
    expect(collected).toEqual([1, 2, 3]);
  });

  it("is a no-op when async iteration already exists", () => {
    expect(installReadableStreamAsyncIterator(ReadableStream)).toBe(false);
  });
});
