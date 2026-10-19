import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

interface SignaturePadProps {
  title: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

// The whole pad is rotated 90° via CSS so a signature gets the phone's long
// edge as its writing width instead of its short one — the same "turn your
// phone sideways" pattern delivery/POS apps use, without needing the device
// to actually leave portrait orientation.
//
// Rotating the box doesn't rotate pointer coordinates — clientX/clientY stay
// in screen space — so drawing has to convert each point through the inverse
// of that rotation. canvas.offsetWidth/offsetHeight (unaffected by CSS
// transforms, unlike getBoundingClientRect) give the canvas's own true
// (pre-rotation) box, which is what the drawing buffer must match 1:1 to
// avoid stretching; getBoundingClientRect gives where that rotated box
// actually sits on screen, which is what pointer events need.
export function SignaturePad({ title, onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth;
    const cssH = canvas.offsetHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Inverse of a 90°-clockwise CSS rotation: a screen point at
  // (screenRelX, screenRelY) within the rotated element's on-screen box
  // lands at local canvas point (screenRelY, localHeight - screenRelX).
  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const screenRelX = e.clientX - rect.left;
    const screenRelY = e.clientY - rect.top;
    return { x: screenRelY, y: canvas.offsetHeight - screenRelX };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
    setHasStroke(true);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const point = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const end = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    setHasStroke(false);
  };

  // The drawing buffer is a fixed wide strip (the whole signing area) so a
  // typical signature only inks a small part of it — exporting the full
  // canvas bakes in a lot of blank margin that then shrinks the actual ink
  // even further once placed in the PDF. Crop to the drawn strokes' own
  // bounding box (plus a little padding) so what gets embedded is just the
  // signature itself.
  function getStrokeBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const i = (py * width + px) * 4;
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
    }
    return maxX < 0 ? null : { minX, minY, maxX, maxY };
  }

  const save = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !hasStroke) return;

    const bounds = getStrokeBounds(ctx, canvas.width, canvas.height);
    if (!bounds) {
      onSave(canvas.toDataURL("image/png"));
      return;
    }
    const pad = 12 * (window.devicePixelRatio || 1);
    const minX = Math.max(0, bounds.minX - pad);
    const minY = Math.max(0, bounds.minY - pad);
    const maxX = Math.min(canvas.width, bounds.maxX + pad);
    const maxY = Math.min(canvas.height, bounds.maxY + pad);

    const cropped = document.createElement("canvas");
    cropped.width = maxX - minX;
    cropped.height = maxY - minY;
    const croppedCtx = cropped.getContext("2d");
    if (!croppedCtx) {
      onSave(canvas.toDataURL("image/png"));
      return;
    }
    croppedCtx.drawImage(canvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    onSave(cropped.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-bg-warm">
      <div
        className="absolute top-1/2 left-1/2 flex flex-col"
        style={{ width: "100vh", height: "100vw", transform: "translate(-50%, -50%) rotate(90deg)" }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle bg-white px-4 py-3">
          <button onClick={onCancel} className="text-sm font-medium text-text-secondary hover:text-brand-dark">
            Cancel
          </button>
          <p className="text-sm font-semibold text-brand-dark">{title}</p>
          <button onClick={clear} className="text-sm font-medium text-text-secondary hover:text-brand-dark">
            Clear
          </button>
        </div>
        <div className="min-h-0 flex-1 p-4">
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="block h-full w-full touch-none rounded-[14px] border border-border-subtle bg-white"
          />
        </div>
        <div className="border-t border-border-subtle bg-white px-4 py-3">
          <Button size="lg" fullWidth disabled={!hasStroke} onClick={save}>
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
