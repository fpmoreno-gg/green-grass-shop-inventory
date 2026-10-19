import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SignaturePad } from "../../components/ui/SignaturePad";
import { useDataReady, useLoans, useSupplies, useTools, useTrailers, useWorkers } from "../../hooks/useData";
import { repository } from "../../data";
import { useAuth } from "../../lib/auth";
import type { SignatureData } from "../../lib/trailerInventoryPdf";
import { withTimeout } from "../../lib/withTimeout";
import type { Supply, Tool, Trailer, TrailerInventoryRecord, Worker } from "../../types/models";

// Some iOS/Safari versions don't expose canShare at all; feature-detect
// rather than assume, so "Send" degrades to a plain download everywhere else.
type NavigatorWithShare = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

function base64ToBlob(base64: string, type = "application/pdf"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Failed to read PDF blob"));
    reader.readAsDataURL(blob);
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function TrailerPdfModal({
  trailer,
  assignedWorker,
  tools,
  trailerSupplies,
  managerName,
  onClose,
}: {
  trailer: Trailer;
  assignedWorker?: Worker;
  tools: Tool[];
  trailerSupplies: { quantity: number; supply: Supply }[];
  managerName?: string;
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [receivedBySignature, setReceivedBySignature] = useState<SignatureData | undefined>();
  const [managerSignature, setManagerSignature] = useState<SignatureData | undefined>();
  const [signing, setSigning] = useState<"receivedBy" | "manager" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [records, setRecords] = useState<TrailerInventoryRecord[] | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TrailerInventoryRecord | null>(null);

  // Live mode: regenerate the PDF whenever a signature changes.
  useEffect(() => {
    if (viewingRecord) return;
    let cancelled = false;
    let localUrl: string | null = null;
    // jsPDF is large and only needed here — loaded on first "View PDF"
    // instead of with the app, which keeps the initial download much smaller.
    import("../../lib/trailerInventoryPdf")
      .then(({ generateTrailerInventoryPdf }) =>
        generateTrailerInventoryPdf({ trailer, assignedWorker, tools, trailerSupplies, receivedBySignature, managerSignature }),
      )
      .then((b) => {
        if (cancelled) return;
        localUrl = URL.createObjectURL(b);
        setBlob(b);
        setPdfUrl(localUrl);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't generate the PDF. Try again.");
      });
    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailer.id, receivedBySignature, managerSignature, viewingRecord]);

  // Archived mode: decode a saved record's stored PDF instead of generating one.
  useEffect(() => {
    if (!viewingRecord) return;
    const b = base64ToBlob(viewingRecord.pdfData);
    const url = URL.createObjectURL(b);
    setBlob(b);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [viewingRecord]);

  const print = () => {
    iframeRef.current?.contentWindow?.print();
  };

  const nav = navigator as NavigatorWithShare;
  const canShareFiles = typeof nav.canShare === "function";

  const send = async () => {
    if (!blob) return;
    const fileName = `Trailer-${trailer.name}-Inventory.pdf`;
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (canShareFiles && nav.canShare!({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: `Trailer ${trailer.name} Inventory` });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
      return;
    }
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName;
    a.click();
  };

  const handleSignatureSave = (dataUrl: string) => {
    const sig: SignatureData = { dataUrl, signedAt: new Date().toISOString() };
    if (signing === "receivedBy") setReceivedBySignature(sig);
    else if (signing === "manager") setManagerSignature(sig);
    setSigning(null);
  };

  const saveRecord = async () => {
    if (!blob) return;
    setSaving(true);
    setSaveError(null);
    try {
      const pdfData = await withTimeout(blobToBase64(blob), 15000, "Taking too long to read the PDF — try again.");
      await withTimeout(
        repository.addTrailerInventoryRecord({
          trailerId: trailer.id,
          trailerName: trailer.name,
          date: new Date().toISOString(),
          generatedBy: managerName,
          receivedBySignedAt: receivedBySignature?.signedAt,
          managerSignedAt: managerSignature?.signedAt,
          pdfData,
        }),
        15000,
        "Saving took too long — check your connection and try again.",
      );
      setRecords(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save trailer inventory record", e);
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async () => {
    setShowHistory(true);
    if (records === null) {
      setLoadingRecords(true);
      setHistoryError(null);
      try {
        const r = await withTimeout(
          repository.getTrailerInventoryRecords(trailer.id),
          15000,
          "Taking too long to load — check your connection and try again.",
        );
        setRecords(r);
      } catch (e) {
        setHistoryError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingRecords(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-warm">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle bg-white px-4 py-3">
        <button onClick={onClose} className="text-sm font-medium text-text-secondary hover:text-brand-dark">
          Close
        </button>
        <p className="truncate text-sm font-semibold text-brand-dark">Trailer {trailer.name} — Inventory</p>
        <button onClick={openHistory} className="text-sm font-medium text-text-secondary hover:text-brand-dark">
          History
        </button>
      </div>

      {viewingRecord && (
        <div className="flex items-center justify-between gap-2 bg-bg-olive-light px-4 py-2">
          <p className="text-xs text-text-primary">Viewing saved record from {formatDateTime(viewingRecord.date)}</p>
          <button onClick={() => setViewingRecord(null)} className="shrink-0 text-xs font-semibold text-brand-dark hover:underline">
            Back to current
          </button>
        </div>
      )}

      {!viewingRecord && (
        <div className="flex gap-2 border-b border-border-subtle bg-white px-4 py-2.5">
          <Button size="md" variant="outline" fullWidth onClick={() => setSigning("receivedBy")}>
            {receivedBySignature ? "✓ Received By" : "Sign: Received By"}
          </Button>
          <Button size="md" variant="outline" fullWidth onClick={() => setSigning("manager")}>
            {managerSignature ? "✓ Manager Approval" : "Sign: Manager Approval"}
          </Button>
        </div>
      )}

      <div className="flex gap-2 border-b border-border-subtle bg-white px-4 py-2.5">
        <Button size="md" variant="outline" fullWidth disabled={!pdfUrl} onClick={print}>
          Print
        </Button>
        <Button size="md" fullWidth disabled={!pdfUrl} onClick={send}>
          {canShareFiles ? "Send" : "Download"}
        </Button>
      </div>

      {!viewingRecord && (
        <div className="border-b border-border-subtle bg-white px-4 py-2.5">
          <Button size="md" variant="secondary" fullWidth disabled={!blob || saving} onClick={saveRecord}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Record"}
          </Button>
          {saveError && <p className="mt-1.5 text-xs text-error">{saveError}</p>}
        </div>
      )}

      <div className="flex-1">
        {error && <p className="p-6 text-sm text-error">{error}</p>}
        {!error && !pdfUrl && <p className="p-6 text-sm text-text-secondary">Generating PDF…</p>}
        {pdfUrl && <iframe ref={iframeRef} src={pdfUrl} title="Trailer inventory PDF" className="h-full w-full border-0" />}
      </div>

      {signing && (
        <SignaturePad
          title={signing === "receivedBy" ? "Received By — Sign below" : "Manager Approval — Sign below"}
          onSave={handleSignatureSave}
          onCancel={() => setSigning(null)}
        />
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[55] flex flex-col bg-bg-warm">
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle bg-white px-4 py-3">
            <button onClick={() => setShowHistory(false)} className="text-sm font-medium text-text-secondary hover:text-brand-dark">
              Close
            </button>
            <p className="text-sm font-semibold text-brand-dark">Signed Records</p>
            <div className="w-10" />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {loadingRecords && <p className="text-sm text-text-secondary">Loading…</p>}
            {historyError && <p className="text-sm text-error">{historyError}</p>}
            {!loadingRecords && !historyError && records?.length === 0 && (
              <p className="text-sm text-text-secondary">No saved records yet for this trailer.</p>
            )}
            {records?.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setViewingRecord(r);
                  setShowHistory(false);
                }}
                className="block w-full rounded-[14px] border border-border-subtle bg-white p-4 text-left hover:border-brand-olive"
              >
                <p className="font-medium">{formatDateTime(r.date)}</p>
                <p className="text-sm text-text-secondary">
                  {r.generatedBy ?? "Unknown"}
                  {r.receivedBySignedAt ? " · Received By signed" : ""}
                  {r.managerSignedAt ? " · Manager signed" : ""}
                  {!r.receivedBySignedAt && !r.managerSignedAt ? " · Unsigned" : ""}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrailerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const trailers = useTrailers();
  const tools = useTools();
  const supplies = useSupplies();
  const workers = useWorkers();
  const loans = useLoans();
  const ready = useDataReady();
  const { manager } = useAuth();
  const [pdfOpen, setPdfOpen] = useState(false);

  const trailer = trailers.find((t) => t.id === id);
  if (!trailer) {
    // An empty `trailers` array (subscription still loading) and a genuinely
    // unknown id both make .find() return undefined — `ready` is what tells
    // them apart, so a fresh visit doesn't flash "not found" before the data
    // arrives.
    if (!ready) return <p className="text-text-secondary">Loading…</p>;
    return <p className="text-text-secondary">Trailer not found.</p>;
  }

  // A trailer's tools are whatever's currently assigned to its worker — not
  // a separately maintained list — so this stays correct the moment a tool
  // is lent or reassigned, instead of needing its own sync step.
  const trailerTools = trailer.assignedWorkerId ? tools.filter((t) => t.assignedTo === trailer.assignedWorkerId) : [];
  const trailerSupplies = trailer.supplies
    .map((ts) => ({ quantity: ts.quantity, supply: supplies.find((s) => s.id === ts.supplyId) }))
    .filter((x) => x.supply !== undefined) as { quantity: number; supply: Supply }[];
  const repairTools = trailerTools.filter((t) => t.status === "repair");
  const lowSupplies = trailerSupplies.filter(({ supply }) => supply.currentQuantity <= supply.reorderPoint);
  const assignedWorker = workers.find((w) => w.id === trailer.assignedWorkerId);
  // Tools out on a Lend Tool loan must come back through Return Tool —
  // "Make Available" here would leave that loan open (see ToolDetail).
  const toolsOnLoan = new Set(loans.filter((l) => !l.returnDate).map((l) => l.toolId));

  const makeAvailable = async (toolId: string) => {
    await repository.updateTool(toolId, { assignedTo: null, status: "available" });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-text-secondary hover:text-brand-dark">
          ← Back
        </button>
        <Button size="md" variant="outline" onClick={() => setPdfOpen(true)}>
          View PDF
        </Button>
      </div>
      <h1 className="text-[28px] font-semibold text-brand-dark">{trailer.name}</h1>

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-text-secondary">Assigned to</p>
        <Select
          value={trailer.assignedWorkerId ?? ""}
          onChange={(e) => repository.updateTrailer(trailer.id, { assignedWorkerId: e.target.value || null })}
        >
          <option value="">— Unassigned —</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        {assignedWorker && <p className="text-sm text-text-secondary">Currently: {assignedWorker.name}</p>}
      </Card>

      {(repairTools.length > 0 || lowSupplies.length > 0) && (
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-error">Needs attention</p>
          {repairTools.map((t) => (
            <p key={t.id} className="text-sm">🔴 {t.brand} {t.model} needs repair</p>
          ))}
          {lowSupplies.map(({ supply }) => (
            <p key={supply.id} className="text-sm">🟡 {supply.name} low on stock</p>
          ))}
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Tools ({trailerTools.length})</h2>
        <div className="space-y-2">
          {trailerTools.map((t) => (
            <Card key={t.id} className="space-y-2">
              <Link to={`/tools/${t.id}`}>
                <p className="font-medium">
                  {t.code && <span className="text-text-secondary">#{t.code} · </span>}
                  {t.brand} {t.model}
                </p>
                <p className="text-sm text-text-secondary">{t.serialNumber ? `S/N ${t.serialNumber}` : t.type}</p>
              </Link>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={t.status} />
                {t.status === "checked_out" &&
                  (toolsOnLoan.has(t.id) ? (
                    <Link to="/loans/return" className="text-sm font-medium text-text-secondary hover:text-brand-dark">
                      On loan — Return Tool →
                    </Link>
                  ) : (
                    <Button size="md" variant="outline" onClick={() => makeAvailable(t.id)}>
                      Make Available
                    </Button>
                  ))}
              </div>
            </Card>
          ))}
          {trailerTools.length === 0 && <p className="text-sm text-text-secondary">No tools assigned.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Supplies ({trailerSupplies.length})</h2>
        <div className="space-y-2">
          {trailerSupplies.map(({ quantity, supply }) => (
            <Card key={supply.id} className="flex items-center justify-between">
              <p className="font-medium">{supply.name}</p>
              <p className="text-sm text-text-secondary">{quantity} {supply.unit}</p>
            </Card>
          ))}
          {trailerSupplies.length === 0 && <p className="text-sm text-text-secondary">No supplies assigned.</p>}
        </div>
      </section>

      {pdfOpen && (
        <TrailerPdfModal
          trailer={trailer}
          assignedWorker={assignedWorker}
          tools={trailerTools}
          trailerSupplies={trailerSupplies}
          managerName={manager?.name}
          onClose={() => setPdfOpen(false)}
        />
      )}
    </div>
  );
}
