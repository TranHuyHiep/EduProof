// A localStorage stand-in for tests.
//
// The Wave 1 proof store is browser-backed, and the tests run in node. Rather
// than pull in a whole DOM implementation for five methods, this provides the
// slice of the Storage API the store actually uses.

class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
}

/**
 * Gives the current test a fresh, empty `window.localStorage`.
 *
 * The store checks `typeof window`, so `window` has to exist as well as the
 * storage on it.
 */
export function installMemoryLocalStorage(): Storage {
  const storage = new MemoryStorage();
  const scope = globalThis as { window?: unknown };
  scope.window = { localStorage: storage };
  (globalThis as { localStorage?: Storage }).localStorage = storage;
  return storage;
}
