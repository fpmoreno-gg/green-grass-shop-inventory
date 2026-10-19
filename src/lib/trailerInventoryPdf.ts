import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../assets/logo.webp";
import type { Supply, Tool, Trailer, Worker } from "../types/models";

// jspdf-autotable attaches `lastAutoTable` onto the jsPDF instance at runtime
// but doesn't type it — this is the documented way to read the table's final
// Y position for laying out content below it.
type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

const BRAND_DARK: [number, number, number] = [45, 60, 57];
const TEXT_SECONDARY: [number, number, number] = [102, 113, 109];
const BORDER: [number, number, number] = [217, 220, 211];
const ROW_ALT: [number, number, number] = [246, 246, 243];

const CATEGORY_LABELS: Record<string, string> = {
  hand_tools: "Hand Tools",
  misc_equipment: "Misc. Equipment",
  uncategorized: "Supplies",
};
const CATEGORY_SORT_ORDER = ["hand_tools", "misc_equipment", "uncategorized"];

// jsPDF's addImage doesn't reliably accept WEBP across versions — drawing
// through a canvas and re-encoding as PNG sidesteps that entirely. Capped at
// 240px before encoding: the logo only ever renders at ~36pt / ~150px on the
// page, and a larger source would bloat the PDF for no visible gain.
const LOGO_MAX_PX = 240;

function loadLogoAsPng(): Promise<{ dataUrl: string; aspect: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL("image/png"), aspect: img.naturalWidth / img.naturalHeight });
    };
    img.onerror = () => reject(new Error("Failed to load logo"));
    img.src = logoUrl;
  });
}

export interface SignatureData {
  dataUrl: string;
  signedAt: string; // ISO timestamp, fixed at the moment of signing
}

function getImageAspect(dataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => reject(new Error("Failed to load signature image"));
    img.src = dataUrl;
  });
}

export interface TrailerInventoryPdfParams {
  trailer: Trailer;
  assignedWorker?: Worker;
  tools: Tool[];
  trailerSupplies: { quantity: number; supply: Supply }[];
  receivedBySignature?: SignatureData;
  managerSignature?: SignatureData;
}

const TABLE_STYLES = {
  fontSize: 7.3,
  cellPadding: 2.5,
  lineColor: BORDER,
  lineWidth: 0.5,
  textColor: [38, 51, 48] as [number, number, number],
};
const TABLE_HEAD_STYLES = {
  fillColor: BRAND_DARK,
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: "bold" as const,
  fontSize: 7.3,
};

export async function generateTrailerInventoryPdf({
  trailer,
  assignedWorker,
  tools,
  trailerSupplies,
  receivedBySignature,
  managerSignature,
}: TrailerInventoryPdfParams): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" }) as DocWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;

  // ---------- Header ----------
  let logoBottom = 28;
  try {
    const logo = await loadLogoAsPng();
    const logoW = 36;
    const logoH = logoW / logo.aspect;
    doc.addImage(logo.dataUrl, "PNG", marginX, 26, logoW, logoH, undefined, "SLOW");
    logoBottom = 26 + logoH;
  } catch {
    // Logo failed to load (e.g. offline cache miss) — fall back to a
    // text-only header rather than blocking the whole document.
  }

  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TOOL & SUPPLIES INVENTORY", marginX + 50, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_SECONDARY);
  doc.text("Inventory Control & Asset Tracking", marginX + 50, 54);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(9);
  doc.text(`Date: ${today}`, pageWidth - marginX, 34, { align: "right" });
  doc.text(`Trailer / Inventory #: ${trailer.name}`, pageWidth - marginX, 46, { align: "right" });

  let y = Math.max(logoBottom, 62) + 8;
  doc.setDrawColor(...BRAND_DARK);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 15;

  // ---------- Assignment information ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("ASSIGNMENT INFORMATION", marginX, y);
  y += 12;

  const fields: [string, string][] = [
    ["Employee Name", assignedWorker?.name ?? ""],
    ["PIN", assignedWorker?.employeeId ?? ""],
    ["Trailer #", trailer.name],
  ];
  const colW = contentWidth / 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  fields.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginX + col * colW;
    const fy = y + row * 19;
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(label, x, fy);
    doc.setTextColor(...BRAND_DARK);
    doc.text(value || " ", x, fy + 11);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.line(x, fy + 13, x + colW - 16, fy + 13);
  });
  y += Math.ceil(fields.length / 2) * 19 + 6;

  // ---------- Machinery table ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text(`MACHINERY (${tools.length})`, marginX, y);
  y += 8;

  const sortedTools = [...tools].sort(
    (a, b) => a.type.localeCompare(b.type) || `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`),
  );

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Item ID", "Category", "Brand / Model", "Serial Number"]],
    body: sortedTools.map((t) => [
      t.code || "—",
      t.type || "—",
      `${t.brand} ${t.model}`.trim() || "—",
      t.serialNumber || "—",
    ]),
    styles: TABLE_STYLES,
    headStyles: TABLE_HEAD_STYLES,
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 100 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 110 },
    },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  // ---------- Supplies table ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text(`SUPPLIES (${trailerSupplies.length})`, marginX, y);
  y += 8;

  const sortedSupplies = [...trailerSupplies].sort((a, b) => {
    const catA = CATEGORY_SORT_ORDER.indexOf(a.supply.category ?? "uncategorized");
    const catB = CATEGORY_SORT_ORDER.indexOf(b.supply.category ?? "uncategorized");
    return catA - catB || a.supply.name.localeCompare(b.supply.name);
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Category", "Item", "Quantity", "Unit"]],
    body: sortedSupplies.map(({ quantity, supply }) => [
      CATEGORY_LABELS[supply.category ?? "uncategorized"],
      supply.name,
      String(quantity),
      supply.unit,
    ]),
    styles: TABLE_STYLES,
    headStyles: TABLE_HEAD_STYLES,
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 55, halign: "center" },
      3: { cellWidth: 70 },
    },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 12;

  // ---------- Summary ----------
  const totalItems = tools.length + trailerSupplies.length;
  const handToolsCount = trailerSupplies.filter(({ supply }) => supply.category === "hand_tools").length;
  const miscEquipmentCount = trailerSupplies.length - handToolsCount;

  // Summary + sign-off together need ~130pt — keep them on the same page as
  // the tables unless there's truly not enough room left.
  if (y > doc.internal.pageSize.getHeight() - 130) {
    doc.addPage();
    y = 50;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("INVENTORY SUMMARY", marginX, y);
  y += 13;

  const summaryItems: [string, string][] = [
    ["Total Items", String(totalItems)],
    ["Machinery", String(tools.length)],
    ["Hand Tools", String(handToolsCount)],
    ["Misc. Equipment", String(miscEquipmentCount)],
  ];
  const summaryColW = contentWidth / 4;
  summaryItems.forEach(([label, value], i) => {
    const x = marginX + i * summaryColW;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.rect(x, y, summaryColW - 10, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BRAND_DARK);
    doc.text(value, x + 8, y + 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(label, x + 8, y + 27);
  });
  y += 32 + 20;

  // ---------- Sign-off ----------
  const signatures = [receivedBySignature, managerSignature];
  // The block (title + per-column label/image/lines) needs ~125pt regardless
  // of whether a signature is actually drawn — unsigned columns reserve the
  // same vertical space so the layout doesn't shift once someone signs.
  if (y > doc.internal.pageSize.getHeight() - 125) {
    doc.addPage();
    y = 50;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  doc.text("SIGN-OFF", marginX, y);
  y += 16;

  // Layout per column (offsets relative to this block's `y`):
  //   y+0   column label ("Received By" / "Manager Approval")
  //   y+3..y+55  signature image, when present, sized up to the full column
  //              width so it's actually legible, sitting just above its line
  //   y+60  signature line
  //   y+68  "Name / Signature" caption
  //   y+84  date line (with the signed date printed just above it, if signed)
  //   y+92  "Date" caption
  const sigColW = contentWidth / 2;
  const labels = ["Received By", "Manager Approval"];
  const MAX_SIG_H = 52;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const sig = signatures[i];
    const x = marginX + i * sigColW;
    const lineW = sigColW - 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(label, x, y);

    if (sig) {
      try {
        const aspect = await getImageAspect(sig.dataUrl);
        // Now that the signature is cropped to its own strokes (see
        // SignaturePad), scale it up to fill the column width — capped by
        // height so a tall/narrow signature doesn't crowd the line below.
        let imgW = lineW;
        let imgH = imgW / aspect;
        if (imgH > MAX_SIG_H) {
          imgH = MAX_SIG_H;
          imgW = imgH * aspect;
        }
        // jsPDF embeds images uncompressed by default (compression "NONE"),
        // which bloats even a small cropped PNG into a near-raw bitmap —
        // this is what was pushing the saved record over Firestore's 1MiB
        // per-document limit. "SLOW" gives the best compression ratio; the
        // extra CPU time is negligible for a single user-triggered save.
        doc.addImage(sig.dataUrl, "PNG", x, y + 3, imgW, imgH, undefined, "SLOW");
      } catch {
        // Corrupt/unreadable signature data — fall back to a blank line below.
      }
    }

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.line(x, y + 60, x + lineW, y + 60);
    doc.line(x, y + 84, x + lineW, y + 84);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text("Name / Signature", x, y + 68);
    doc.text("Date", x, y + 92);
    if (sig) {
      const signedDate = new Date(sig.signedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      doc.setTextColor(...BRAND_DARK);
      doc.text(signedDate, x, y + 80);
    }
  }

  // Draw footers last, once the final page count is known, so every page
  // (including ones added after the tables by the summary/sign-off sections)
  // reports the correct "Page X of Y".
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, i, pageCount);
  }

  return doc.output("blob");
}

function drawFooter(doc: jsPDF, pageWidth: number, pageNum: number, pageCount: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_SECONDARY);
  doc.text("Green Grass Landscape | Internal Inventory Control", 40, pageHeight - 24);
  doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - 40, pageHeight - 24, { align: "right" });
}
