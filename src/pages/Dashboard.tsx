import { Link } from "react-router-dom";
import { KpiCard } from "../components/ui/KpiCard";
import { Card } from "../components/ui/Card";
import { useAuth } from "../lib/auth";
import { useLoans, useSupplies, useTools } from "../hooks/useData";
import { isOverdue } from "../lib/isOverdue";

export function Dashboard() {
  const { manager } = useAuth();
  const tools = useTools();
  const loans = useLoans();
  const supplies = useSupplies();

  const activeLoans = loans.filter((l) => !l.returnDate).length;
  const toolsInShop = tools.filter((t) => t.status === "available").length;
  const lowStock = supplies.filter((s) => s.currentQuantity <= s.reorderPoint);
  const needsRepair = tools.filter((t) => t.status === "repair");
  const overdueLoans = loans.filter((l) => !l.returnDate && l.expectedReturnDate && isOverdue(l.expectedReturnDate));
  const attentionCount = overdueLoans.length + needsRepair.length + lowStock.length;

  return (
    <div className="space-y-4">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 bg-bg-warm px-4 pb-3 will-change-transform sm:-mx-6 sm:px-6">
        <h1 className="text-[28px] font-semibold text-brand-dark">Good morning — {manager?.name ?? "Shop Manager"}</h1>
        <p className="text-text-secondary">Shop Inventory overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Active Loans" value={activeLoans} />
        <KpiCard label="Tools in Shop" value={toolsInShop} />
        <KpiCard label="Low Stock" value={lowStock.length} tone={lowStock.length ? "warning" : "default"} />
        <KpiCard label="Needs Repair" value={needsRepair.length} tone={needsRepair.length ? "error" : "default"} />
      </div>

      <Link to="/attention">
        <Card
          className={`flex items-center justify-between hover:border-brand-olive ${attentionCount > 0 ? "border-error/40" : ""}`}
        >
          <span className="flex items-center gap-2 font-semibold text-brand-dark">
            {attentionCount > 0 ? "⚠️" : "✅"} Attention Required
            {overdueLoans.length > 0 && <span className="text-sm font-normal text-error">· {overdueLoans.length} overdue</span>}
          </span>
          <span className={`text-lg font-bold ${attentionCount > 0 ? "text-error" : "text-text-secondary"}`}>{attentionCount}</span>
        </Card>
      </Link>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/loans/new" className="col-span-1">
            <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-[14px] bg-brand-dark text-white shadow-[0_2px_8px_rgba(45,60,57,0.06)]">
              <span className="text-2xl">➕</span>
              <span className="font-semibold">Lend Tool</span>
            </div>
          </Link>
          <Link to="/loans/return">
            <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-[14px] bg-brand-dark text-white shadow-[0_2px_8px_rgba(45,60,57,0.06)]">
              <span className="text-2xl">↩️</span>
              <span className="font-semibold">Return Tool</span>
            </div>
          </Link>
          <Link to="/tools/new">
            <div className="flex h-20 flex-col items-center justify-center gap-1 rounded-[14px] bg-bg-olive-light text-brand-dark">
              <span className="text-xl">➕</span>
              <span className="text-sm font-semibold">Add Tool</span>
            </div>
          </Link>
          <Link to="/supplies">
            <div className="flex h-20 flex-col items-center justify-center gap-1 rounded-[14px] bg-bg-olive-light text-brand-dark">
              <span className="text-xl">📦</span>
              <span className="text-sm font-semibold">Update Stock</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
