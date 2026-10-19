// Minimal localStorage-backed store with pub/sub, used as the "demo mode"
// repository when no Firebase project is configured (see src/data/index.ts).
// Lets the whole app run and be tested in-browser with zero backend setup.

type Listener<T> = (value: T) => void;

export class Collection<T extends { id: string }> {
  private key: string;
  private listeners = new Set<Listener<T[]>>();

  constructor(key: string, seed: T[]) {
    this.key = `green-grass-demo:${key}`;
    if (localStorage.getItem(this.key) === null) {
      localStorage.setItem(this.key, JSON.stringify(seed));
    }
  }

  private read(): T[] {
    const raw = localStorage.getItem(this.key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  }

  private write(items: T[]) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.listeners.forEach((l) => l(items));
    window.dispatchEvent(new CustomEvent("demo-store-change", { detail: this.key }));
  }

  all(): T[] {
    return this.read();
  }

  get(id: string): T | undefined {
    return this.read().find((i) => i.id === id);
  }

  add(item: T) {
    const items = this.read();
    items.push(item);
    this.write(items);
  }

  update(id: string, patch: Partial<T>) {
    const items = this.read().map((i) => (i.id === id ? { ...i, ...patch } : i));
    this.write(items);
  }

  delete(id: string) {
    this.write(this.read().filter((i) => i.id !== id));
  }

  subscribe(cb: Listener<T[]>): () => void {
    this.listeners.add(cb);
    cb(this.read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === this.key) cb(this.read());
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === this.key) cb(this.read());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("demo-store-change", onCustom as EventListener);
    return () => {
      this.listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("demo-store-change", onCustom as EventListener);
    };
  }
}

export function newId(): string {
  return crypto.randomUUID();
}
