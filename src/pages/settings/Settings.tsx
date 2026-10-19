import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Pill } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/Input";
import { SearchBar } from "../../components/ui/SearchBar";
import { isFirebaseConfigured } from "../../lib/firebase";
import { useShopManagers, useWorkers } from "../../hooks/useData";
import { repository } from "../../data";
import { searchWorkers } from "../../lib/searchWorkers";
import { withTimeout } from "../../lib/withTimeout";
import { useAuth } from "../../lib/auth";

export function Settings() {
  const { manager: signedIn } = useAuth();
  const managers = useShopManagers();
  const workers = useWorkers();
  const [workerSearch, setWorkerSearch] = useState("");
  const visibleWorkers = searchWorkers(workers, workerSearch);

  const [managerName, setManagerName] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [savingManager, setSavingManager] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);

  const [editingManagerId, setEditingManagerId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingManager, setDeletingManager] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [workerName, setWorkerName] = useState("");
  const [workerBranch, setWorkerBranch] = useState("");
  const [workerEmployeeId, setWorkerEmployeeId] = useState("");
  const [savingWorker, setSavingWorker] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  const addManager = async () => {
    if (!managerName.trim() || !/^\d{4,6}$/.test(managerPin)) return;
    if (managers.some((m) => m.pin === managerPin)) {
      setManagerError("That PIN is already in use by another Shop Manager.");
      return;
    }
    setSavingManager(true);
    setManagerError(null);
    try {
      await withTimeout(
        repository.addShopManager({ name: managerName.trim(), pin: managerPin }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      setManagerName("");
      setManagerPin("");
    } catch (err) {
      setManagerError(err instanceof Error ? err.message : "Failed to save — try again.");
    } finally {
      setSavingManager(false);
    }
  };

  const startEditManager = (id: string, name: string, pin: string) => {
    setEditingManagerId(id);
    setEditName(name);
    setEditPin(pin);
    setEditError(null);
  };

  const cancelEditManager = () => {
    setEditingManagerId(null);
    setEditName("");
    setEditPin("");
    setEditError(null);
  };

  const saveEditManager = async () => {
    if (!editingManagerId || !editName.trim() || !/^\d{4,6}$/.test(editPin)) return;
    if (managers.some((m) => m.id !== editingManagerId && m.pin === editPin)) {
      setEditError("That PIN is already in use by another Shop Manager.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await withTimeout(
        repository.updateShopManager(editingManagerId, { name: editName.trim(), pin: editPin }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      cancelEditManager();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save — try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDeleteManager = async (id: string) => {
    setDeletingManager(true);
    setDeleteError(null);
    try {
      await withTimeout(repository.deleteShopManager(id), 15000, "Taking too long to delete — check your connection and try again.");
      setConfirmDeleteId(null);
      if (editingManagerId === id) cancelEditManager();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete — try again.");
    } finally {
      setDeletingManager(false);
    }
  };

  const addWorker = async () => {
    if (!workerName.trim()) return;
    setSavingWorker(true);
    setWorkerError(null);
    try {
      await withTimeout(
        repository.addWorker({
          name: workerName.trim(),
          branch: workerBranch.trim(),
          employeeId: workerEmployeeId.trim() || undefined,
          source: "manual",
        }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      setWorkerName("");
      setWorkerBranch("");
      setWorkerEmployeeId("");
    } catch (err) {
      setWorkerError(err instanceof Error ? err.message : "Failed to save — try again.");
    } finally {
      setSavingWorker(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 bg-bg-warm px-4 pb-4 text-[28px] font-semibold text-brand-dark will-change-transform sm:-mx-6 sm:px-6">Settings</h1>

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-text-secondary">Backend</p>
        {isFirebaseConfigured ? <Pill tone="success">Firestore connected</Pill> : <Pill tone="warning">Demo mode (localStorage)</Pill>}
        <p className="text-sm text-text-secondary">
          {isFirebaseConfigured
            ? "The app is reading and writing to your Firebase project."
            : "Set the VITE_FIREBASE_* variables in .env to connect a real Firestore project."}
        </p>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-text-secondary">Shop Managers</p>
        {managers.map((m) => {
          if (editingManagerId === m.id) {
            return (
              <div key={m.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="min-w-28 flex-1" />
                  <div className="w-24 shrink-0">
                    <Input
                      inputMode="numeric"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                  <Button size="md" onClick={saveEditManager} disabled={savingEdit || !editName.trim() || editPin.length < 4}>
                    {savingEdit ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" onClick={cancelEditManager} disabled={savingEdit}>
                    Cancel
                  </Button>
                </div>
                {editError && <p className="text-xs font-medium text-error">{editError}</p>}
              </div>
            );
          }

          if (confirmDeleteId === m.id) {
            return (
              <div key={m.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-text-secondary">Delete "{m.name}"? This can't be undone.</span>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => confirmDeleteManager(m.id)} disabled={deletingManager}>
                      {deletingManager ? "Deleting…" : "Delete"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConfirmDeleteId(null);
                        setDeleteError(null);
                      }}
                      disabled={deletingManager}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
                {deleteError && <p className="text-xs font-medium text-error">{deleteError}</p>}
              </div>
            );
          }

          return (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>
                {m.name}
                {m.id === signedIn?.id && <span className="ml-1.5 text-xs text-text-secondary">(you)</span>}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-text-disabled">PIN ••••</span>
                <button
                  type="button"
                  aria-label={`Edit ${m.name}`}
                  onClick={() => startEditManager(m.id, m.name, m.pin)}
                  className="text-text-secondary hover:text-brand-dark"
                >
                  <Pencil size={16} strokeWidth={2} />
                </button>
                {/* Can't delete yourself: it would end this session, and
                    deleting the last manager would lock everyone out of the
                    app (login requires a manager PIN). */}
                {m.id !== signedIn?.id && (
                  <button
                    type="button"
                    aria-label={`Delete ${m.name}`}
                    onClick={() => {
                      setConfirmDeleteId(m.id);
                      setDeleteError(null);
                    }}
                    className="text-text-secondary hover:text-error"
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {managers.length === 0 && <p className="text-sm text-text-secondary">No Shop Manager yet.</p>}
        <div className="space-y-1.5 pt-1">
          <div className="flex gap-2">
            <Input placeholder="Name" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
            <Input
              placeholder="PIN"
              inputMode="numeric"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-24"
            />
            <Button onClick={addManager} disabled={savingManager || !managerName.trim() || managerPin.length < 4}>
              {savingManager ? "Saving…" : "+ Add"}
            </Button>
          </div>
          {managerError && <p className="text-xs font-medium text-error">{managerError}</p>}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-text-secondary">Employees (Workers)</p>
        {workers.length > 5 && <SearchBar value={workerSearch} onChange={setWorkerSearch} placeholder="Search by PIN or name…" />}
        {visibleWorkers.map((w) => (
          <div key={w.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {w.name}
              {w.source === "trellis" && <span className="text-xs font-medium text-info">Trellis</span>}
            </span>
            <span className="text-text-secondary">{w.employeeId ? `ID ${w.employeeId}` : w.branch}</span>
          </div>
        ))}
        {workers.length === 0 && <p className="text-sm text-text-secondary">No employees yet.</p>}
        {workers.length > 0 && visibleWorkers.length === 0 && (
          <p className="text-sm text-text-secondary">No employee matches that search.</p>
        )}
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Name" value={workerName} onChange={(e) => setWorkerName(e.target.value)} className="min-w-32 flex-1" />
            <Input placeholder="Crew" value={workerBranch} onChange={(e) => setWorkerBranch(e.target.value)} className="w-28" />
            <Input placeholder="Employee ID" value={workerEmployeeId} onChange={(e) => setWorkerEmployeeId(e.target.value)} className="w-28" />
            <Button onClick={addWorker} disabled={savingWorker || !workerName.trim()}>
              {savingWorker ? "Saving…" : "+ Add"}
            </Button>
          </div>
          {workerError && <p className="text-xs font-medium text-error">{workerError}</p>}
        </div>
      </Card>

      <div>
        <Label>What's the PIN for?</Label>
        <p className="text-sm text-text-secondary">
          Identifies who made each loan/return on the team. It's not a strong security credential — anyone with
          physical access to the shop can use it, same as a cash-register PIN.
        </p>
      </div>
    </div>
  );
}
