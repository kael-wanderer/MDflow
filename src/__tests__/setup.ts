// Minimal in-memory localStorage for tests (Node env, no DOM needed).
class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v));
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
}

if (typeof (globalThis as any).localStorage === "undefined") {
  (globalThis as any).localStorage = new MemoryStorage();
}
