import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trailer } from "lucide-react";
import { SearchBar } from "../../components/ui/SearchBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { useTools } from "../../hooks/useData";
import { searchTools } from "../../lib/searchTools";
import type { ToolStatus } from "../../types/models";

const statusFilters: { key: ToolStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "checked_out", label: "Checked Out" },
  { key: "repair", label: "Repair" },
  { key: "retired", label: "Retired" },
];

// With 1,900+ tools now in the catalog, rendering every matching card (each
// with an embedded photo) at once makes scrolling heavy on a phone. Page
// the results instead and let people load more as they go.
const PAGE_SIZE = 60;

export function ToolsCatalog() {
  const tools = useTools();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ToolStatus | "all">("all");
  const [group, setGroup] = useState("all");
  const [type, setType] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const groups = useMemo(() => Array.from(new Set(tools.map((t) => t.group))).sort(), [tools]);
  const types = useMemo(() => Array.from(new Set(tools.map((t) => t.type))).sort(), [tools]);

  const filtered = useMemo(
    () =>
      searchTools(tools, query).filter((t) => {
        const matchesStatus = status === "all" || t.status === status;
        const matchesGroup = group === "all" || t.group === group;
        const matchesType = type === "all" || t.type === type;
        return matchesStatus && matchesGroup && matchesType;
      }),
    [tools, query, status, group, type],
  );

  const visible = filtered.slice(0, visibleCount);

  const updateQuery = (v: string) => {
    setQuery(v);
    setVisibleCount(PAGE_SIZE);
  };
  const updateStatus = (v: ToolStatus | "all") => {
    setStatus(v);
    setVisibleCount(PAGE_SIZE);
  };
  const updateGroup = (v: string) => {
    setGroup(v);
    setVisibleCount(PAGE_SIZE);
  };
  const updateType = (v: string) => {
    setType(v);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 space-y-3 bg-bg-warm px-4 pb-4 will-change-transform sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[28px] font-semibold text-brand-dark">Tools</h1>
          <div className="flex items-center gap-2">
            <Link to="/trailers">
              <Button variant="outline" aria-label="Trailers">
                <Trailer size={18} strokeWidth={2} aria-hidden />
              </Button>
            </Link>
            <Link to="/tools/new">
              <Button>+ Add Tool</Button>
            </Link>
          </div>
        </div>

        <SearchBar value={query} onChange={updateQuery} placeholder="Search by ID, type or brand…" />

        <div className="relative -mx-4 sm:-mx-6">
          <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => updateStatus(f.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  status === f.key ? "bg-brand-dark text-white" : "bg-white text-text-secondary border border-border-subtle"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Hints that the pill row scrolls (e.g. "Retired" sits past the
              right edge) — otherwise nothing signals there's more to see. */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg-warm to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select value={type} onChange={(e) => updateType(e.target.value)} className="min-w-0 truncate rounded-full border border-border-subtle bg-white px-3.5 py-1.5 text-sm">
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={group} onChange={(e) => updateGroup(e.target.value)} className="min-w-0 truncate rounded-full border border-border-subtle bg-white px-3.5 py-1.5 text-sm">
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🛠️" title="No tools found" subtitle="Try a different search or filter." />
      ) : (
        <div className="divide-y divide-border-subtle overflow-hidden rounded-[14px] border border-border-subtle bg-white">
          {visible.map((t) => (
            <Link
              to={`/tools/${t.id}`}
              key={t.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-bg-warm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {t.code && <span className="text-text-secondary">#{t.code} · </span>}
                  {t.brand} {t.model}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {t.type}
                  {t.serialNumber ? ` · S/N ${t.serialNumber}` : ""}
                  {t.homeLocation ? ` · ${t.homeLocation}` : ""}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      )}

      {visibleCount < filtered.length && (
        <div className="flex flex-col items-center gap-2 pb-2">
          <p className="text-sm text-text-secondary">
            Showing {visible.length} of {filtered.length}
          </p>
          <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
