import type { Tool } from "../types/models";

// Next sequential short code for a newly added tool, e.g. "0001", "0002"…
// Zero-padded to 4 digits (plain increment past 9999).
export function nextToolCode(tools: Tool[]): string {
  const max = tools.reduce((m, t) => {
    const n = Number(t.code);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const next = max + 1;
  return next < 10000 ? String(next).padStart(4, "0") : String(next);
}
