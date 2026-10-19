import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SearchBar } from "../../components/ui/SearchBar";
import { Input, Textarea } from "../../components/ui/Input";
import { BackButton } from "../../components/ui/BackButton";
import { searchWorkers } from "../../lib/searchWorkers";
import { searchTools } from "../../lib/searchTools";
import { useTools, useWorkers } from "../../hooks/useData";
import { repository } from "../../data";
import { useAuth } from "../../lib/auth";
import { withTimeout } from "../../lib/withTimeout";
import { localDateString } from "../../lib/isOverdue";
import type { CheckoutCondition } from "../../types/models";

const steps = ["Tool", "Employee", "Condition", "Return By", "Note"];

const conditionOptions: { key: CheckoutCondition; label: string; icon: string }[] = [
  { key: "good", label: "Good", icon: "🟢" },
  { key: "minor_damage", label: "Minor Damage", icon: "🟡" },
  { key: "damaged", label: "Damaged", icon: "🔴" },
];

const durationOptions: { label: string; days: number }[] = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

export function LendTool() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { manager } = useAuth();
  const tools = useTools();
  const workers = useWorkers();

  const [step, setStep] = useState(0);
  const [toolId, setToolId] = useState(params.get("toolId") ?? "");
  const [workerId, setWorkerId] = useState("");
  const [condition, setCondition] = useState<CheckoutCondition>("good");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [note, setNote] = useState("");
  const [workerPin, setWorkerPin] = useState("");
  const [toolQuery, setToolQuery] = useState("");
  const [workerQuery, setWorkerQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTools = tools.filter((t) => t.status === "available");
  const filteredTools = searchTools(availableTools, toolQuery);
  const filteredWorkers = searchWorkers(workers, workerQuery);

  const selectedTool = useMemo(() => tools.find((t) => t.id === toolId), [tools, toolId]);
  const selectedWorker = useMemo(() => workers.find((w) => w.id === workerId), [workers, workerId]);

  const selectWorker = (id: string) => {
    setWorkerId(id);
    setWorkerPin("");
  };

  // The worker's Employee ID doubles as their confirmation PIN (same
  // low-friction, non-cryptographic trust model as the Shop Manager PIN) —
  // but a worker without one on file shouldn't block the loan, so
  // confirmation is simply skipped for them.
  const requiresWorkerPin = Boolean(selectedWorker?.employeeId);
  const workerPinOk = !requiresWorkerPin || workerPin === selectedWorker?.employeeId;

  // A ?toolId= link (from Tool Detail) can point at a tool that's already
  // out or in repair — only an available tool may be lent.
  const toolAvailable = selectedTool?.status === "available";

  const canNext = [toolAvailable, Boolean(workerId), true, Boolean(expectedReturnDate), true][step];

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await withTimeout(
        repository.createLoan({
          toolId,
          workerId,
          checkoutDate: new Date().toISOString(),
          checkoutCondition: condition,
          expectedReturnDate,
          checkoutNote: note || undefined,
          shopManager: manager?.name ?? "Unknown",
          workerConfirmedAt: requiresWorkerPin ? new Date().toISOString() : undefined,
        }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      navigate("/", { state: { toast: "Tool successfully checked out" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 space-y-4 bg-bg-warm px-4 pb-4 will-change-transform sm:-mx-6 sm:px-6">
        <BackButton />
        <h1 className="text-[28px] font-semibold text-brand-dark">Lend Tool</h1>

        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-dark" : "bg-border-subtle"}`} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
      {step === 0 && (
        <div className="space-y-3">
          <SearchBar value={toolQuery} onChange={setToolQuery} placeholder="Search by ID, type or brand…" />
          {selectedTool && !toolAvailable && (
            <p className="text-sm font-medium text-error">
              {selectedTool.brand} {selectedTool.model} isn't available to lend right now — pick another tool.
            </p>
          )}
          <div className="space-y-2">
            {filteredTools.map((t) => (
              <Card
                key={t.id}
                onClick={() => setToolId(t.id)}
                className={`cursor-pointer ${toolId === t.id ? "border-brand-dark ring-1 ring-brand-dark" : ""}`}
              >
                <p className="font-medium">
                  {t.code && <span className="text-text-secondary">#{t.code} · </span>}
                  {t.brand} {t.model}
                </p>
                <p className="text-sm text-text-secondary">
                  {t.type}
                  {t.serialNumber ? ` · S/N ${t.serialNumber}` : ""}
                </p>
              </Card>
            ))}
            {filteredTools.length === 0 && <p className="text-sm text-text-secondary">No available tools match.</p>}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <SearchBar value={workerQuery} onChange={setWorkerQuery} placeholder="Search by PIN or name…" />
          <div className="space-y-2">
            {filteredWorkers.map((w) => (
              <Card
                key={w.id}
                onClick={() => selectWorker(w.id)}
                className={`cursor-pointer ${workerId === w.id ? "border-brand-dark ring-1 ring-brand-dark" : ""}`}
              >
                <p className="font-medium">{w.name}</p>
                {/* PIN deliberately not shown: it's what the worker types to confirm at the end. */}
                {w.branch && <p className="text-sm text-text-secondary">{w.branch}</p>}
              </Card>
            ))}
          </div>
        </div>
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

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-text-secondary">When should it be back?</p>
          <div className="grid grid-cols-3 gap-2">
            {durationOptions.map((d) => (
              <button
                key={d.label}
                onClick={() => setExpectedReturnDate(addDays(d.days))}
                className={`rounded-[11px] border px-3 py-2.5 text-sm font-medium ${
                  expectedReturnDate === addDays(d.days)
                    ? "border-brand-dark bg-bg-olive-light"
                    : "border-border-subtle bg-white text-text-secondary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={expectedReturnDate}
            min={localDateString()}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            className="h-12 w-full rounded-[11px] border border-border-subtle bg-white px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-olive"
          />
        </div>
      )}

      {step === 4 && <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" />}
      </div>

      <div className="sticky bottom-[calc(60px+env(safe-area-inset-bottom,0px))] -mx-4 space-y-3 bg-bg-warm px-4 pb-3 pt-2 sm:-mx-6 sm:px-6 md:bottom-0">
        <Card className="space-y-1 text-sm">
          <p className="font-semibold text-text-secondary">Summary</p>
          <p>Tool: {selectedTool ? `${selectedTool.brand} ${selectedTool.model}` : "—"}</p>
          <p>Employee: {selectedWorker?.name ?? "—"}</p>
          <p>Condition: {conditionOptions.find((c) => c.key === condition)?.label}</p>
          <p>Return by: {expectedReturnDate ? new Date(expectedReturnDate + "T00:00:00").toLocaleDateString() : "—"}</p>
        </Card>

        {step === steps.length - 1 && selectedWorker && (
          <div>
            {requiresWorkerPin ? (
              <>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {selectedWorker.name}, enter your PIN to confirm you're receiving this tool
                </label>
                <Input
                  inputMode="numeric"
                  value={workerPin}
                  onChange={(e) => setWorkerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Worker PIN"
                />
              </>
            ) : (
              <p className="text-xs text-text-secondary">No PIN on file for {selectedWorker.name} — confirmation skipped.</p>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-error">{error}</p>}

        <div className="flex gap-3 border-t border-border-subtle pt-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button fullWidth disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button fullWidth size="lg" disabled={submitting || !workerPinOk} onClick={submit}>
              {submitting ? "Confirming…" : "CONFIRM LOAN"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
