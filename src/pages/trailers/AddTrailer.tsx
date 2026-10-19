import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input, Label, Select } from "../../components/ui/Input";
import { BackButton } from "../../components/ui/BackButton";
import { repository } from "../../data";
import { useWorkers } from "../../hooks/useData";
import { withTimeout } from "../../lib/withTimeout";

export function AddTrailer() {
  const navigate = useNavigate();
  const workers = useWorkers();
  const [name, setName] = useState("");
  const [assignedWorkerId, setAssignedWorkerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await withTimeout(
        repository.addTrailer({
          name: name.trim(),
          supplies: [],
          assignedWorkerId: assignedWorkerId || null,
        }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      navigate("/trailers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <BackButton />
      <h1 className="text-[28px] font-semibold text-brand-dark">New Trailer</h1>
      <Card className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2162" />
        </div>
        <div>
          <Label>Assigned to (optional)</Label>
          <Select value={assignedWorkerId} onChange={(e) => setAssignedWorkerId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      {error && <p className="text-sm font-medium text-error">{error}</p>}
      <Button size="lg" fullWidth disabled={!name.trim() || saving} onClick={submit}>
        {saving ? "Saving…" : "Save Trailer"}
      </Button>
    </div>
  );
}
