import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { BarChart } from "../../components/charts/BarChart";
import { DonutChart } from "../../components/charts/DonutChart";
import { Select, Label } from "../../components/ui/Input";
import { useLoans, useSupplies, useSupplyMovements, useTools, useTrailers, useWorkers } from "../../hooks/useData";
import { localDateString } from "../../lib/isOverdue";

// Monday of the week containing `iso`, as a local "YYYY-MM-DD" — sorts
// chronologically as a plain string, unlike a "week of the month" label.
function weekStart(iso: string): string {
  const d = new Date(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDateString(d);
}

const MAX_WORKER_BARS = 8;

export function Reports() {
  const loans = useLoans();
  const tools = useTools();
  const workers = useWorkers();
  const trailers = useTrailers();
  const supplies = useSupplies();
  const movements = useSupplyMovements();

  const [workerId, setWorkerId] = useState("all");
  const [trailerId, setTrailerId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Timestamps are stored in UTC; the From/To pickers are local dates.
  const inRange = (iso: string) => {
    const day = localDateString(new Date(iso));
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  };

  const filteredLoans = loans.filter((l) => {
    if (workerId !== "all" && l.workerId !== workerId) return false;
    if (trailerId !== "all") {
      const trailer = trailers.find((t) => t.id === trailerId);
      const tool = tools.find((t) => t.id === l.toolId);
      if (!trailer?.assignedWorkerId || tool?.assignedTo !== trailer.assignedWorkerId) return false;
    }
    return inRange(l.checkoutDate);
  });

  const returned = filteredLoans.filter((l) => l.returnDate);
  const damaged = filteredLoans.filter((l) => l.returnCondition === "damaged" || l.returnCondition === "needs_repair");
  const retiredTools = tools.filter((t) => t.status === "retired");

  const filteredMovements = movements.filter((m) => inRange(m.date));
  const consumedOut = filteredMovements.filter((m) => m.type === "out");
  const consumableCostBySupply = useMemo(() => {
    const bySupply = new Map<string, number>();
    for (const m of consumedOut) {
      const supply = supplies.find((s) => s.id === m.supplyId);
      if (!supply) continue;
      const cost = (supply.cost ?? 0) * m.quantity;
      bySupply.set(supply.name, (bySupply.get(supply.name) ?? 0) + cost);
    }
    return Array.from(bySupply.entries()).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
  }, [consumedOut, supplies]);

  // Who's taking the most consumables — always across everyone in the
  // selected date range, regardless of the Employee filter above, since the
  // point is comparing people against each other.
  const consumableUsageByWorker = useMemo(() => {
    const byWorker = new Map<string, number>();
    let untracked = 0;
    for (const m of consumedOut) {
      if (!m.workerId) {
        untracked += m.quantity;
        continue;
      }
      const worker = workers.find((w) => w.id === m.workerId);
      const label = worker?.name ?? "Unknown";
      byWorker.set(label, (byWorker.get(label) ?? 0) + m.quantity);
    }
    const rows = Array.from(byWorker.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_WORKER_BARS);
    return { rows, untracked };
  }, [consumedOut, workers]);

  const inventoryValue = supplies.reduce((sum, s) => sum + s.currentQuantity * (s.cost ?? 0), 0);

  const loansByWeek = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const l of filteredLoans) {
      const key = weekStart(l.checkoutDate);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([start, value]) => ({
        label: new Date(`${start}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value,
      }));
  }, [filteredLoans]);

  return (
    <div className="space-y-6">
      <h1 className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 bg-bg-warm px-4 pb-4 text-[28px] font-semibold text-brand-dark will-change-transform sm:-mx-6 sm:px-6">Reports</h1>

      <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <Label>From</Label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 w-full rounded-[11px] border border-border-subtle px-3" />
        </div>
        <div>
          <Label>To</Label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 w-full rounded-[11px] border border-border-subtle px-3" />
        </div>
        <div>
          <Label>Employee</Label>
          <Select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
            <option value="all">All</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Trailer</Label>
          <Select value={trailerId} onChange={(e) => setTrailerId(e.target.value)}>
            <option value="all">All</option>
            {trailers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Loans" value={filteredLoans.length} />
        <KpiCard label="Returns" value={returned.length} />
        <KpiCard label="Damaged" value={damaged.length} tone={damaged.length ? "error" : "default"} />
        <KpiCard label="Retired Tools" value={retiredTools.length} />
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Loans per week</h2>
        {loansByWeek.length ? <BarChart data={loansByWeek} /> : <p className="text-sm text-text-secondary">No data for this filter.</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Consumable cost by item</h2>
        {consumableCostBySupply.length ? (
          <DonutChart data={consumableCostBySupply} />
        ) : (
          <p className="text-sm text-text-secondary">No consumable withdrawals in this range.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Who's consuming the most</h2>
        {consumableUsageByWorker.rows.length ? (
          <BarChart data={consumableUsageByWorker.rows} />
        ) : (
          <p className="text-sm text-text-secondary">No consumable withdrawals in this range.</p>
        )}
        {consumableUsageByWorker.untracked > 0 && (
          <p className="mt-2 text-xs text-text-secondary">
            {consumableUsageByWorker.untracked} units withdrawn before worker tracking was added, not shown above.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold text-brand-dark">Inventory value (supplies)</h2>
        <p className="text-sm text-text-secondary mb-2">
          Tools don't have a cost field in the current data model, so inventory value is calculated from supplies only
          (quantity × cost).
        </p>
        <p className="text-[32px] font-bold text-brand-dark">${inventoryValue.toFixed(2)}</p>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold text-brand-dark">Repair cost</h2>
        <p className="text-sm text-text-secondary">
          Not tracked yet — the model has no repair-cost field. Add one to `tools.issues` or a `repairs` collection to
          report this.
        </p>
      </Card>
    </div>
  );
}
