import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input, Label, Select } from "../../components/ui/Input";
import { BackButton } from "../../components/ui/BackButton";
import { repository } from "../../data";
import { withTimeout } from "../../lib/withTimeout";
import type { SupplyCategory } from "../../types/models";

export function AddSupply() {
  const navigate = useNavigate();
  // "" = consumable (no category): those are pinned in the top "Supplies"
  // group on the Supplies page, above the trailer-equipment categories.
  const [form, setForm] = useState({
    name: "",
    currentQuantity: 0,
    reorderPoint: 0,
    unit: "",
    supplier: "",
    cost: 0,
    category: "" as SupplyCategory | "",
  });
  const hasNegative = form.currentQuantity < 0 || form.reorderPoint < 0 || form.cost < 0;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await withTimeout(
        repository.addSupply({ ...form, name: form.name.trim(), category: form.category || undefined }),
        15000,
        "Taking too long to save — check your connection and try again.",
      );
      navigate("/supplies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <BackButton />
      <h1 className="text-[28px] font-semibold text-brand-dark">New Supply</h1>
      <Card className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as SupplyCategory | "" }))}>
            <option value="">Supplies (consumables)</option>
            <option value="hand_tools">Hand Tools</option>
            <option value="misc_equipment">Misc. Equipment</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Current Quantity</Label>
            <Input type="number" value={form.currentQuantity} onChange={(e) => setForm((f) => ({ ...f, currentQuantity: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Reorder Point</Label>
            <Input type="number" value={form.reorderPoint} onChange={(e) => setForm((f) => ({ ...f, reorderPoint: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Unit</Label>
            <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="e.g. gallons" />
          </div>
          <div>
            <Label>Cost (per unit)</Label>
            <Input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) }))} />
          </div>
        </div>
        <div>
          <Label>Supplier</Label>
          <Input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
        </div>
      </Card>
      {hasNegative && <p className="text-sm font-medium text-error">Quantities and cost can't be negative.</p>}
      {error && <p className="text-sm font-medium text-error">{error}</p>}
      <Button size="lg" fullWidth disabled={!form.name.trim() || hasNegative || saving} onClick={submit}>
        {saving ? "Saving…" : "Save Supply"}
      </Button>
    </div>
  );
}
