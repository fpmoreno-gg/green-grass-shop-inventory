import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Textarea, Select } from "../../components/ui/Input";
import { useDataReady, useLoans, useTools, useWorkers } from "../../hooks/useData";
import { repository } from "../../data";
import { useAuth } from "../../lib/auth";
import { isOverdue } from "../../lib/isOverdue";

export function ToolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tools = useTools();
  const loans = useLoans();
  const workers = useWorkers();
  const ready = useDataReady();
  const { manager } = useAuth();
  const [note, setNote] = useState("");
  // Photos live outside the tool list fetch (see DataRepository.getToolPhoto)
  // so browsing/searching tools doesn't pull every photo over the wire —
  // fetched here on demand since this is the one screen that shows it.
  const [photo, setPhoto] = useState<string | undefined>();

  const tool = tools.find((t) => t.id === id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setPhoto(undefined);
    repository
      .getToolPhoto(id)
      .then((p) => {
        if (!cancelled) setPhoto(p);
      })
      .catch(() => {
        // No photo offline / not cached — the placeholder stays.
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const toolLoans = loans.filter((l) => l.toolId === id).sort((a, b) => b.checkoutDate.localeCompare(a.checkoutDate));
  const activeLoan = toolLoans.find((l) => !l.returnDate);
  const activeWorker = activeLoan ? workers.find((w) => w.id === activeLoan.workerId) : undefined;

  if (!tool) {
    // Same "loading vs. genuinely missing" distinction as TrailerDetail —
    // without `ready`, every fresh visit flashes "not found" before the
    // tools subscription delivers its first snapshot.
    if (!ready) return <p className="text-text-secondary">Loading…</p>;
    return <p className="text-text-secondary">Tool not found.</p>;
  }

  const retireTool = async () => {
    if (!confirm(`Retire ${tool.brand} ${tool.model}? This cannot be undone easily.`)) return;
    await repository.updateTool(tool.id, { status: "retired" });
  };

  const addIssue = async () => {
    if (!note.trim()) return;
    await repository.addToolIssue(tool.id, { note, date: new Date().toISOString(), userId: manager?.id ?? "unknown" });
    if (tool.status !== "retired") {
      await repository.updateTool(tool.id, { status: "repair" });
    }
    setNote("");
  };

  const reassign = async (workerId: string) => {
    await repository.updateTool(tool.id, {
      assignedTo: workerId || null,
      status: workerId ? "checked_out" : "available",
    });
  };

  const markFixed = async () => {
    await repository.updateTool(tool.id, { status: tool.assignedTo ? "checked_out" : "available" });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-text-secondary hover:text-brand-dark">
        ← Back
      </button>

      {photo ? (
        <div className="flex h-56 items-center justify-center rounded-[14px] bg-bg-olive-light p-4">
          <img src={photo} alt="" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center rounded-[14px] bg-bg-olive-light text-6xl">🛠️</div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-brand-dark">
            {tool.brand} {tool.model}
          </h1>
          <p className="text-text-secondary">
            {tool.code && <span className="font-medium text-text-primary">#{tool.code} · </span>}
            {tool.type}
          </p>
        </div>
        <StatusBadge status={tool.status} />
      </div>

      {tool.source === "trellis" && (
        <p className="text-xs font-medium text-info">
          Synced from Trellis — read only. Status and data update from there; they're not edited here.
        </p>
      )}

      {tool.status === "repair" && (
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-error">Needs repair</p>
          <p className="text-sm text-text-secondary">
            Fixed it? Marking it fixed clears the Repair status
            {tool.assignedTo ? " and returns it to its assigned worker." : " and makes it available again."} The issue
            notes below stay in the log.
          </p>
          <Button onClick={markFixed}>Mark as Fixed</Button>
        </Card>
      )}

      {/* With an open Lend Tool loan, changing the assignment here would leave
          that loan open against a tool that reads "available" — so the loan
          has to be closed through Return Tool instead. */}
      {activeLoan && (
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-text-secondary">Assigned to</p>
          <p className="text-sm">
            On loan to <strong>{activeWorker?.name ?? "Unknown"}</strong>. Use Return Tool to close the loan before
            reassigning it.
          </p>
          <Link to="/loans/return">
            <Button variant="outline">↩ Return Tool</Button>
          </Link>
        </Card>
      )}

      {!activeLoan && (tool.status === "available" || tool.status === "checked_out") && (
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-text-secondary">Assigned to</p>
          <Select value={tool.assignedTo ?? ""} onChange={(e) => reassign(e.target.value)}>
            <option value="">— Unassigned (available) —</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-text-secondary">
            Direct assignment — for tools that didn't come through a Lend Tool checkout (e.g. synced from Trellis).
            Changing it here doesn't create a Loan record.
          </p>
        </Card>
      )}

      <Card className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-text-secondary">Group</p>
          <p className="font-medium">{tool.group || "—"}</p>
        </div>
        <div>
          <p className="text-text-secondary">Serial Number</p>
          <p className="font-medium">{tool.serialNumber || "—"}</p>
        </div>
        <div>
          <p className="text-text-secondary">Home Location</p>
          <p className="font-medium">{tool.homeLocation || "—"}</p>
        </div>
        <div>
          <p className="text-text-secondary">Status</p>
          <p className="font-medium capitalize">{tool.status.replace("_", " ")}</p>
        </div>
      </Card>

      {activeLoan && (
        <Card className="space-y-1">
          <p className="text-sm font-semibold text-info">Currently checked out</p>
          <p className="text-sm">
            To <strong>{activeWorker?.name ?? "Unknown"}</strong>
            {activeWorker?.branch && ` (${activeWorker.branch})`}
          </p>
          <p className="text-xs text-text-secondary">Since {new Date(activeLoan.checkoutDate).toLocaleString()}</p>
          {activeLoan.expectedReturnDate && (
            <p className={`text-xs font-medium ${isOverdue(activeLoan.expectedReturnDate) ? "text-error" : "text-text-secondary"}`}>
              {isOverdue(activeLoan.expectedReturnDate) ? "Overdue — " : "Expected back "}
              {new Date(activeLoan.expectedReturnDate + "T00:00:00").toLocaleDateString()}
            </p>
          )}
          {activeLoan.checkoutNote && <p className="text-xs text-text-secondary">Note: {activeLoan.checkoutNote}</p>}
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Loan History</h2>
        {toolLoans.length === 0 ? (
          <p className="text-sm text-text-secondary">No loan history yet.</p>
        ) : (
          <div className="space-y-2 border-l-2 border-border-subtle pl-4">
            {toolLoans.map((l) => {
              const worker = workers.find((w) => w.id === l.workerId);
              return (
                <div key={l.id} className="relative pb-3">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-olive" />
                  <p className="text-sm font-medium">{worker?.name ?? "Unknown"}</p>
                  <p className="text-xs text-text-secondary">
                    Out {new Date(l.checkoutDate).toLocaleDateString()} ({l.checkoutCondition}) · by {l.shopManager}
                    {l.returnDate
                      ? ` · Returned ${new Date(l.returnDate).toLocaleDateString()} (${l.returnCondition})${l.returnShopManager ? ` by ${l.returnShopManager}` : ""}`
                      : " · Active"}
                  </p>
                  {!l.returnDate && l.expectedReturnDate && (
                    <p className={`text-xs ${isOverdue(l.expectedReturnDate) ? "font-medium text-error" : "text-text-secondary"}`}>
                      {isOverdue(l.expectedReturnDate) ? "Overdue — " : "Due "}
                      {new Date(l.expectedReturnDate + "T00:00:00").toLocaleDateString()}
                    </p>
                  )}
                  {(l.workerConfirmedAt || l.returnWorkerConfirmedAt) && (
                    <p className="text-xs text-success">
                      {l.workerConfirmedAt && "✓ Worker confirmed receipt"}
                      {l.workerConfirmedAt && l.returnWorkerConfirmedAt && " · "}
                      {l.returnWorkerConfirmedAt && "✓ Worker confirmed return"}
                    </p>
                  )}
                  {l.checkoutNote && <p className="text-xs text-text-secondary">Note: {l.checkoutNote}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Issues</h2>
        <div className="space-y-2">
          {tool.issues.length === 0 && <p className="text-sm text-text-secondary">No issues reported.</p>}
          {tool.issues.map((issue) => (
            <Card key={issue.id} className="text-sm">
              <p>{issue.note}</p>
              <p className="mt-1 text-xs text-text-secondary">{new Date(issue.date).toLocaleString()}</p>
            </Card>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Report an issue…" className="flex-1" />
          <Button onClick={addIssue} disabled={!note.trim()}>
            Add
          </Button>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        {tool.status === "available" ? (
          <Link to={`/loans/new?toolId=${tool.id}`}>
            <Button>Lend this tool</Button>
          </Link>
        ) : (
          <Button disabled>Lend this tool</Button>
        )}
        {tool.status !== "retired" && tool.source !== "trellis" && (
          <Button variant="destructive" onClick={retireTool}>
            Retire Tool
          </Button>
        )}
      </div>
    </div>
  );
}
