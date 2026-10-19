import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Label, Textarea } from "../../components/ui/Input";
import { SearchBar } from "../../components/ui/SearchBar";
import { EmptyState } from "../../components/ui/EmptyState";
import { useSupplies, useSupplyMovements, useWorkers } from "../../hooks/useData";
import { repository } from "../../data";
import { useAuth } from "../../lib/auth";
import { withTimeout } from "../../lib/withTimeout";
import { searchWorkers } from "../../lib/searchWorkers";
import type { Supply, SupplyCategory } from "../../types/models";

function stockTone(s: Supply): { tone: "success" | "warning" | "error"; icon: string } {
  if (s.currentQuantity <= 0) return { tone: "error", icon: "🔴" };
  if (s.currentQuantity <= s.reorderPoint) return { tone: "warning", icon: "🟡" };
  return { tone: "success", icon: "🟢" };
}

const CATEGORY_LABELS: Record<SupplyCategory | "uncategorized", string> = {
  uncategorized: "Supplies",
  hand_tools: "Hand Tools",
  misc_equipment: "Misc. Equipment",
};
// Uncategorized items (consumables that don't belong to either trailer-equipment
// bucket, e.g. trash bags, herbicide, trimmer line) stay pinned at the top.
const CATEGORY_ORDER: (SupplyCategory | "uncategorized")[] = ["uncategorized", "hand_tools", "misc_equipment"];

export function Supplies() {
  const supplies = useSupplies();
  const workers = useWorkers();
  const movements = useSupplyMovements();
  const { manager } = useAuth();
  const [active, setActive] = useState<Supply | null>(null);
  const [historyFor, setHistoryFor] = useState<Supply | null>(null);
  const [type, setType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Who's actually taking the consumable — required on withdrawals so usage
  // traces back to a person, not just whoever's logged in as shop manager.
  const [workerId, setWorkerId] = useState("");
  const [workerQuery, setWorkerQuery] = useState("");
  const filteredWorkers = searchWorkers(workers, workerQuery);
  const selectedWorker = workers.find((w) => w.id === workerId);
  // Supplies is a short list (unlike the 1,900-tool catalog), so fetching
  // every photo here is cheap — still kept in its own collection so this
  // list's own subscription stays light regardless.
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const requestedPhotoIds = useRef(new Set<string>());

  // Keyed on the set of ids, not the supplies array: every stock adjustment
  // produces a new array, which used to re-download every photo each time.
  const supplyIdsKey = supplies.map((s) => s.id).sort().join(",");
  useEffect(() => {
    const missing = supplyIdsKey.split(",").filter((id) => id && !requestedPhotoIds.current.has(id));
    missing.forEach((id) => {
      requestedPhotoIds.current.add(id);
      repository
        .getSupplyPhoto(id)
        .then((photo) => {
          if (photo) setPhotos((prev) => ({ ...prev, [id]: photo }));
        })
        .catch(() => {
          // Retry on a later visit (e.g. was offline and not cached yet).
          requestedPhotoIds.current.delete(id);
        });
    });
  }, [supplyIdsKey]);

  const grouped = useMemo(() => {
    const groups: Record<string, Supply[]> = { hand_tools: [], misc_equipment: [], uncategorized: [] };
    for (const s of supplies) {
      const key = s.category ?? "uncategorized";
      groups[key].push(s);
    }
    return groups;
  }, [supplies]);

  const openAdjust = (s: Supply, t: "in" | "out") => {
    setActive(s);
    setType(t);
    setQuantity(1);
    setNote("");
    setWorkerId("");
    setWorkerQuery("");
    setError(null);
  };

  // Read the live quantity, not the snapshot captured when the dialog opened.
  const inStock = supplies.find((s) => s.id === active?.id)?.currentQuantity ?? active?.currentQuantity ?? 0;
  const overdraw = type === "out" && quantity > inStock;

  const submit = async () => {
    if (!active) return;
    if (type === "out" && !workerId) return;
    if (overdraw) return;
    setSaving(true);
    setError(null);
    const delta = type === "in" ? quantity : -quantity;
    try {
      await withTimeout(
        repository.adjustSupply(active.id, delta, {
          type,
          quantity,
          date: new Date().toISOString(),
          note: note || undefined,
          shopManager: manager?.name ?? "Unknown",
          workerId: type === "out" ? workerId : undefined,
        }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      setActive(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 flex items-center justify-between bg-bg-warm px-4 pb-4 will-change-transform sm:-mx-6 sm:px-6">
        <h1 className="text-[28px] font-semibold text-brand-dark">Supplies</h1>
        <Link to="/supplies/new">
          <Button>+ New Supply</Button>
        </Link>
      </div>

      {supplies.length === 0 ? (
        <EmptyState icon="📦" title="No supplies yet" />
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((key) => grouped[key].length > 0).map((key) => (
            <div key={key} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{CATEGORY_LABELS[key]}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {grouped[key].map((s) => {
                  const { tone, icon } = stockTone(s);
                  const pct = Math.min(100, (s.currentQuantity / Math.max(s.reorderPoint * 2, 1)) * 100);
                  const barColor = tone === "error" ? "bg-error" : tone === "warning" ? "bg-warning" : "bg-success";
                  return (
                    <Card key={s.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        {photos[s.id] ? (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-bg-olive-light p-1.5">
                            <img src={photos[s.id]} alt="" className="h-full w-full object-contain" />
                          </div>
                        ) : (
                          // Same placeholder convention as ToolDetail's photo-less
                          // tools: an icon in an olive-light box, so cards stay a
                          // consistent shape whether or not a photo exists.
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-bg-olive-light text-2xl">
                            📦
                          </div>
                        )}
                        <div className="flex min-w-0 flex-1 items-center justify-between">
                          <p className="truncate font-semibold">{s.name}</p>
                          <span>{icon}</span>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {s.currentQuantity} / reorder at {s.reorderPoint} {s.unit}
                      </p>
                      <div className="h-2 w-full rounded-full bg-bg-olive-light">
                        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="md" fullWidth onClick={() => openAdjust(s, "in")}>
                          + Add Inventory
                        </Button>
                        <Button size="md" variant="outline" fullWidth onClick={() => openAdjust(s, "out")}>
                          − Withdraw
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHistoryFor(s)}
                        className="text-xs font-medium text-text-secondary underline-offset-2 hover:text-brand-dark hover:underline"
                      >
                        View history
                      </button>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-[18px]">
            <h2 className="text-lg font-semibold text-brand-dark">
              {type === "in" ? "Add Inventory" : "Withdraw Stock"} — {active.name}
            </h2>
            <div>
              <Label>Quantity ({active.unit})</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              {overdraw && (
                <p className="mt-1.5 text-xs font-medium text-error">
                  Only {inStock} {active.unit} in stock.
                </p>
              )}
            </div>
            {type === "out" && (
              <div>
                <Label>Who's taking it?</Label>
                {selectedWorker ? (
                  <div className="flex items-center justify-between rounded-[11px] border border-brand-dark bg-bg-olive-light px-3.5 py-2.5">
                    <span className="text-sm font-medium">{selectedWorker.name}</span>
                    <button
                      type="button"
                      onClick={() => setWorkerId("")}
                      className="text-sm text-text-secondary hover:text-brand-dark"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <SearchBar value={workerQuery} onChange={setWorkerQuery} placeholder="Search by PIN or name…" />
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
                      {filteredWorkers.map((w) => (
                        <button
                          type="button"
                          key={w.id}
                          onClick={() => setWorkerId(w.id)}
                          className="block w-full rounded-[11px] border border-border-subtle bg-white px-3.5 py-2 text-left text-sm hover:border-brand-olive"
                        >
                          <span className="font-medium">{w.name}</span>
                          {w.employeeId && <span className="text-text-secondary"> · PIN {w.employeeId}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <p className="text-sm font-medium text-error">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setActive(null)}>
                Cancel
              </Button>
              <Button fullWidth disabled={saving || quantity <= 0 || overdraw || (type === "out" && !workerId)} onClick={submit}>
                {saving ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="flex max-h-[80vh] w-full max-w-sm flex-col gap-3 rounded-[18px]">
            <h2 className="text-lg font-semibold text-brand-dark">History — {historyFor.name}</h2>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {movements
                .filter((m) => m.supplyId === historyFor.id)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((m) => {
                  const worker = m.workerId ? workers.find((w) => w.id === m.workerId) : undefined;
                  return (
                    <div key={m.id} className="border-b border-border-subtle pb-2 text-sm last:border-0">
                      <p className="font-medium">
                        {m.type === "in" ? "+" : "−"}
                        {m.quantity} {historyFor.unit} · {new Date(m.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {worker ? `Taken by ${worker.name} · ` : ""}Recorded by {m.shopManager}
                      </p>
                      {m.note && <p className="text-xs text-text-secondary">Note: {m.note}</p>}
                    </div>
                  );
                })}
              {movements.filter((m) => m.supplyId === historyFor.id).length === 0 && (
                <p className="text-sm text-text-secondary">No history yet.</p>
              )}
            </div>
            <Button variant="outline" fullWidth onClick={() => setHistoryFor(null)}>
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
