// Safety net for a flaky connection: without this, a stalled read/write
// leaves the UI stuck on "Saving…"/"Loading…" forever with no way to recover.
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}
