import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { useLoans, useTools, useWorkers } from "../../hooks/useData";
import { isOverdue } from "../../lib/isOverdue";

export function Loans() {
  const loans = useLoans();
  const tools = useTools();
  const workers = useWorkers();

  const sorted = [...loans].sort((a, b) => b.checkoutDate.localeCompare(a.checkoutDate));

  return (
    <div className="space-y-5">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 flex items-center justify-between bg-bg-warm px-4 pb-4 will-change-transform sm:-mx-6 sm:px-6">
        <h1 className="text-[28px] font-semibold text-brand-dark">Loans</h1>
        <div className="flex gap-2">
          <Link to="/loans/return">
            <Button variant="secondary">↩ Return Tool</Button>
          </Link>
          <Link to="/loans/new">
            <Button>+ Lend Tool</Button>
          </Link>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="📋" title="No loans yet" subtitle="Lend a tool to see it here." />
      ) : (
        <div className="space-y-2">
          {sorted.map((l) => {
            const tool = tools.find((t) => t.id === l.toolId);
            const worker = workers.find((w) => w.id === l.workerId);
            const active = !l.returnDate;
            const overdue = active && l.expectedReturnDate ? isOverdue(l.expectedReturnDate) : false;
            return (
              <Card key={l.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {tool?.code && <span className="text-text-secondary">#{tool.code} · </span>}
                    {tool?.brand} {tool?.model} → {worker?.name}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {tool?.type}
                    {tool?.serialNumber ? ` · S/N ${tool.serialNumber}` : ""}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Out {new Date(l.checkoutDate).toLocaleDateString()}
                    {l.returnDate
                      ? ` · Returned ${new Date(l.returnDate).toLocaleDateString()}`
                      : l.expectedReturnDate
                        ? ` · Due ${new Date(l.expectedReturnDate + "T00:00:00").toLocaleDateString()}`
                        : ""}
                  </p>
                  {l.checkoutNote && <p className="text-sm text-text-secondary">Note: {l.checkoutNote}</p>}
                </div>
                {overdue ? (
                  <Pill tone="error">Overdue</Pill>
                ) : active ? (
                  <Pill tone="info">Active</Pill>
                ) : (
                  <Pill tone="success">Returned</Pill>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
