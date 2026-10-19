import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useTools, useTrailers, useWorkers } from "../../hooks/useData";

export function Trailers() {
  const trailers = useTrailers();
  const tools = useTools();
  const workers = useWorkers();

  return (
    <div className="space-y-5">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 flex items-center justify-between bg-bg-warm px-4 pb-4 will-change-transform sm:-mx-6 sm:px-6">
        <h1 className="text-[28px] font-semibold text-brand-dark">Trailers</h1>
        <Link to="/trailers/new">
          <Button>+ New Trailer</Button>
        </Link>
      </div>

      {trailers.length === 0 ? (
        <EmptyState icon="🚚" title="No trailers yet" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trailers.map((t) => {
            // A trailer's tools are whatever's currently assigned to its
            // worker — not a separately maintained list — so this stays
            // correct the moment a tool is lent or reassigned.
            const trailerTools = t.assignedWorkerId ? tools.filter((tool) => tool.assignedTo === t.assignedWorkerId) : [];
            const needsRepair = trailerTools.some((tool) => tool.status === "repair");
            const assignedWorker = workers.find((w) => w.id === t.assignedWorkerId);
            return (
              <Link to={`/trailers/${t.id}`} key={t.id}>
                <Card className="space-y-2 hover:border-brand-olive">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{t.name}</p>
                    <span>{needsRepair ? "🔴" : "🟢"}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{assignedWorker?.name ?? "Unassigned"}</p>
                  <p className="text-xs text-text-secondary">{trailerTools.length} tools · {t.supplies.length} supplies</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
