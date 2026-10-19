import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { BackButton } from "../components/ui/BackButton";
import { EmptyState } from "../components/ui/EmptyState";
import { useLoans, useSupplies, useTools, useWorkers } from "../hooks/useData";
import { isOverdue } from "../lib/isOverdue";

export function AttentionRequired() {
  const navigate = useNavigate();
  const loans = useLoans();
  const tools = useTools();
  const workers = useWorkers();
  const supplies = useSupplies();

  const overdueLoans = loans
    .filter((l) => !l.returnDate && l.expectedReturnDate && isOverdue(l.expectedReturnDate))
    .sort((a, b) => (a.expectedReturnDate ?? "").localeCompare(b.expectedReturnDate ?? ""));
  const needsRepair = tools.filter((t) => t.status === "repair");
  const lowStock = supplies.filter((s) => s.currentQuantity <= s.reorderPoint);

  const total = overdueLoans.length + needsRepair.length + lowStock.length;

  return (
    <div className="max-w-2xl space-y-6">
      <BackButton />
      <h1 className="text-[28px] font-semibold text-brand-dark">Attention Required</h1>

      {total === 0 ? (
        <EmptyState icon="✅" title="Nothing needs attention right now" />
      ) : (
        <>
          {overdueLoans.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-brand-dark">Overdue Loans ({overdueLoans.length})</h2>
              <div className="space-y-2">
                {overdueLoans.map((l) => {
                  const tool = tools.find((t) => t.id === l.toolId);
                  const worker = workers.find((w) => w.id === l.workerId);
                  return (
                    <Card
                      key={l.id}
                      className="flex cursor-pointer items-center gap-3 hover:border-brand-olive"
                      onClick={() => navigate(`/tools/${l.toolId}`)}
                    >
                      <span>🔴</span>
                      <span className="text-sm">
                        <strong>
                          {tool?.code && `#${tool.code} `}
                          {tool?.brand} {tool?.model}
                        </strong>{" "}
                        → {worker?.name ?? "Unknown"} — due{" "}
                        {l.expectedReturnDate && new Date(l.expectedReturnDate + "T00:00:00").toLocaleDateString()}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {needsRepair.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-brand-dark">Needs Repair ({needsRepair.length})</h2>
              <div className="space-y-2">
                {needsRepair.map((t) => (
                  <Link to={`/tools/${t.id}`} key={t.id}>
                    <Card className="flex items-center gap-3 hover:border-brand-olive">
                      <span>🔴</span>
                      <span className="text-sm">
                        <strong>{t.type}</strong> {t.brand} {t.model} needs repair
                      </span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {lowStock.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-brand-dark">Low Stock ({lowStock.length})</h2>
              <div className="space-y-2">
                {lowStock.map((s) => (
                  <Link to="/supplies" key={s.id}>
                    <Card className="flex items-center gap-3 hover:border-brand-olive">
                      <span>🟡</span>
                      <span className="text-sm">
                        <strong>{s.name}</strong> is low on stock ({s.currentQuantity} {s.unit})
                      </span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
