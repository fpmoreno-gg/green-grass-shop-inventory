import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { BackButton } from "../../components/ui/BackButton";
import { repository } from "../../data";
import { useTools } from "../../hooks/useData";
import { nextToolCode } from "../../lib/nextToolCode";
import { withTimeout } from "../../lib/withTimeout";

export function AddTool() {
  const navigate = useNavigate();
  const tools = useTools();
  const [form, setForm] = useState({ type: "", brand: "", model: "", serialNumber: "", group: "", homeLocation: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const id = await withTimeout(
        repository.addTool({
          ...form,
          status: "available",
          assignedTo: null,
          source: "manual",
          code: nextToolCode(tools),
        }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      navigate(`/tools/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — try again.");
      setSaving(false);
    }
  };

  const canSave = form.type && form.brand && form.model && form.serialNumber;

  return (
    <div className="max-w-xl space-y-5">
      <BackButton />
      <h1 className="text-[28px] font-semibold text-brand-dark">Add Tool</h1>
      <p className="text-sm text-text-secondary">
        For small tools not tracked in Trellis (scissors, rakes, etc). Large machinery syncs in from Trellis later —
        it's not added here.
      </p>
      <Card className="space-y-4">
        <div>
          <Label>Type</Label>
          <Input value={form.type} onChange={update("type")} placeholder="e.g. Drill" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Brand</Label>
            <Input value={form.brand} onChange={update("brand")} />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={form.model} onChange={update("model")} />
          </div>
        </div>
        <div>
          <Label>Serial Number</Label>
          <Input value={form.serialNumber} onChange={update("serialNumber")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Group</Label>
            <Input value={form.group} onChange={update("group")} placeholder="e.g. Power Tools" />
          </div>
          <div>
            <Label>Home Location</Label>
            <Input value={form.homeLocation} onChange={update("homeLocation")} placeholder="e.g. Main Shop" />
          </div>
        </div>
      </Card>
      {error && <p className="text-sm font-medium text-error">{error}</p>}
      <Button size="lg" fullWidth disabled={!canSave || saving} onClick={submit}>
        {saving ? "Saving…" : "Save Tool"}
      </Button>
    </div>
  );
}
