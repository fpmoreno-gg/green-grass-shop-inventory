import type { Tool } from "../types/models";

// Same priority as searchWorkers: the short code (e.g. "0001") is the
// primary way a tool is looked up in the field, then type/brand/model/serial.
function matchScore(tool: Tool, query: string): number {
  if (!query) return 1;
  const q = query.trim().toLowerCase();
  const code = tool.code?.toLowerCase() ?? "";

  if (code && code === q) return 100;
  if (code && code.startsWith(q)) return 90;
  if (code && code.includes(q)) return 70;
  if (tool.serialNumber.toLowerCase().includes(q)) return 50;
  if (tool.type.toLowerCase().includes(q)) return 40;
  if (tool.brand.toLowerCase().includes(q)) return 35;
  if (tool.model.toLowerCase().includes(q)) return 30;
  return 0;
}

export function searchTools(tools: Tool[], query: string): Tool[] {
  return tools
    .map((t) => ({ t, score: matchScore(t, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}
