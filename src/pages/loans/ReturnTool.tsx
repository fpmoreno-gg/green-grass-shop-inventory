import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { SearchBar } from "../../components/ui/SearchBar";
import { BackButton } from "../../components/ui/BackButton";
import { useLoans, useTools, useWorkers } from "../../hooks/useData";
import { searchWorkers } from "../../lib/searchWorkers";
import { searchTools } from "../../lib/searchTools";
import { repository } from "../../data";
import { useAuth } from "../../lib/auth";
import { withTimeout } from "../../lib/withTimeout";
import { isOverdue } from "../../lib/isOverdue";
import type { ReturnCondition } from "../../types/models";

const steps = ["Find Loan", "Details", "Condition"];

const conditionOptions: { key: ReturnCondition; label: string; icon: string }[] = [
  { key: "good", label: "Good", icon: "🟢" },
  { key: "damaged", label: "Damaged", icon: "🟡" },
  { key: "needs_repair", label: "Needs Repair", icon: "🔴" },
];

export function ReturnTool() {
  const navigate = useNavigate();
  const { manager } = useAuth();
  const loans = useLoans();
  const tools = useTools();
  const workers = useWorkers();

  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [loanId, setLoanId] = useState("");
  const [condition, setCondition] = useState<ReturnCondition>("good");
  const [workerPin, setWorkerPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLoans = loans.filter((l) => !l.returnDate);
  // PIN/tool code is the primary lookup (see src/lib/searchWorkers.ts and
  // searchTools.ts), name/type/serial a secondary fallback.
  const matchingWorkerIds = new Set(searchWorkers(workers, query).map((w) => w.id));
  const matchingToolIds = new Set(searchTools(tools, query).map((t) => t.id));
  const filtered = activeLoans
    .filter((l) => !query || matchingWorkerIds.has(l.workerId) || matchingToolIds.has(l.toolId))
    .sort((a, b) => Number(matchingWorkerIds.has(b.workerId)) - Number(matchingWorkerIds.has(a.workerId)));

  const loan = activeLoans.find((l) => l.id === loanId);
  const tool = loan ? tools.find((t) => t.id === loan.toolId) : undefined;
  const worker = loan ? workers.find((w) => w.id === loan.workerId) : undefined;

  const selectLoan = (id: string) => {
    setLoanId(id);
    setWorkerPin("");
  };

  // Same low-friction confirmation model as checkout (see LendTool) — the
  // worker's own Employee ID doubles as their PIN; missing one just skips
  // confirmation instead of blocking the return.
  const requiresWorkerPin = Boolean(worker?.employeeId);
  const workerPinOk = !requiresWorkerPin || workerPin === worker?.employeeId;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await withTimeout(
        repository.returnLoan(loanId, {
          returnDate: new Date().toISOString(),
          returnCondition: condition,
          returnShopManager: manager?.name ?? "Unknown",
          returnWorkerConfirmedAt: requiresWorkerPin ? new Date().toISOString() : null,
        }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      navigate("/", { state: { toast: "Tool returned successfully" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 space-y-4 bg-bg-warm px-4 pb-4 will-change-transform sm:-mx-6 sm:px-6">
        <BackButton />
        <h1 className="text-[28px] font-semibold text-brand-dark">Return Tool</h1>

        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-dark" : "bg-border-subtle"}`} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
      {step === 0 && (
        <div className="space-y-3">
          <SearchBar value={query} onChange={setQuery} placeholder="Search by PIN or tool ID…" />
          <div className="space-y-2">
            {filtered.map((l) => {
              const t = tools.find((x) => x.id === l.toolId);
              const w = workers.find((x) => x.id === l.workerId);
              return (
                <Card
                  key={l.id}
                  onClick={() => selectLoan(l.id)}
                  className={`cursor-pointer ${loanId === l.id ? "border-brand-dark ring-1 ring-brand-dark" : ""}`}
                >
                  <p className="font-medium">
                    {t?.code && <span className="text-text-secondary">#{t.code} · </span>}
                    {t?.brand} {t?.model}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {w?.name} · Out since {new Date(l.checkoutDate).toLocaleDateString()}
                  </p>
                  {l.expectedReturnDate && (
                    <p className={`text-xs font-medium ${isOverdue(l.expectedReturnDate) ? "text-error" : "text-text-secondary"}`}>
                      {isOverdue(l.expectedReturnDate) ? "Overdue — was due " : "Due "}
                      {new Date(l.expectedReturnDate + "T00:00:00").toLocaleDateString()}
                    </p>
                  )}
                </Card>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-text-secondary">No active loans match.</p>}
          </div>
        </div>
      )}

      {step === 1 && loan && (
        <Card className="space-y-2 text-sm">
          <p>
            Tool: <strong>{tool?.code ? `#${tool.code} ` : ""}{tool?.brand} {tool?.model}</strong> ({tool?.serialNumber || "no serial"})
          </p>
          <p>Employee: <strong>{worker?.name}</strong></p>
          <p>Checked out: {new Date(loan.checkoutDate).toLocaleString()}</p>
          <p>Checkout condition: {loan.checkoutCondition}</p>
          {loan.expectedReturnDate && (
            <p className={isOverdue(loan.expectedReturnDate) ? "font-medium text-error" : ""}>
              {isOverdue(loan.expectedReturnDate) ? "Was due " : "Due "}
              {new Date(loan.expectedReturnDate + "T00:00:00").toLocaleDateString()}
            </p>
          )}
          {loan.checkoutNote && <p>Note: {loan.checkoutNote}</p>}
        </Card>
      )}

      {step === 2 && (
        <div className="grid grid-cols-3 gap-3">
          {conditionOptions.map((c) => (
            <button
              key={c.key}
              onClick={() => setCondition(c.key)}
              className={`flex flex-col items-center gap-2 rounded-[14px] border p-5 ${
                condition === c.key ? "border-brand-dark bg-bg-olive-light" : "border-border-subtle bg-white"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-sm font-medium">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {step === steps.length - 1 && worker && (
        <div>
          {requiresWorkerPin ? (
            <>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                {worker.name}, enter your PIN to confirm you're returning this tool
              </label>
              <Input
                inputMode="numeric"
                value={workerPin}
                onChange={(e) => setWorkerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Worker PIN"
              />
            </>
          ) : (
            <p className="text-xs text-text-secondary">No PIN on file for {worker.name} — confirmation skipped.</p>
          )}
        </div>
      )}
      </div>

      {error && <p className="text-sm font-medium text-error">{error}</p>}

      <div className="sticky bottom-[calc(60px+env(safe-area-inset-bottom,0px))] -mx-4 flex gap-3 border-t border-border-subtle bg-bg-warm px-4 py-3 sm:-mx-6 sm:px-6 md:bottom-0">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button fullWidth disabled={step === 0 && !loanId} onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button fullWidth size="lg" disabled={submitting || !workerPinOk} onClick={submit}>
            {submitting ? "Confirming…" : "CONFIRM RETURN"}
          </Button>
        )}
      </div>
    </div>
  );
}
