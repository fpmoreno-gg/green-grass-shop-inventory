import type { Worker } from "../types/models";

// Shop managers look people up by employee PIN/ID first (it's what's on the
// trailer sheet and what workers know off the top of their head), name
// second. Used everywhere a worker is searched: Lend Tool, Return Tool.
function matchScore(worker: Worker, query: string): number {
  if (!query) return 1;
  const q = query.trim().toLowerCase();
  const id = worker.employeeId?.toLowerCase() ?? "";
  const name = worker.name.toLowerCase();

  if (id && id === q) return 100;
  if (id && id.startsWith(q)) return 90;
  if (id && id.includes(q)) return 70;
  if (name.startsWith(q)) return 60;
  if (name.includes(q)) return 40;
  if (worker.branch.toLowerCase().includes(q)) return 10;
  return 0;
}

export function searchWorkers(workers: Worker[], query: string): Worker[] {
  return workers
    .map((w) => ({ w, score: matchScore(w, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.w);
}
