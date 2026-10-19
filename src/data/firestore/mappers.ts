// Maps between the app's camelCase TS models and the snake_case Firestore
// field names used in the spec's data model (tools, workers, loans,
// supplies, trailers). Keeping the mapping in one place is what makes a
// future Trellis read-only integration easy to reason about: Trellis only
// ever needs to resolve `worker_id` / tool identifiers, never write here.
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import type {
  Loan,
  ShopManager,
  Supply,
  SupplyMovement,
  Tool,
  Trailer,
  TrailerInventoryRecord,
  TrailerSupply,
  Worker,
} from "../../types/models";

export const toolToDoc = (t: Omit<Tool, "id">) => ({
  code: t.code ?? null,
  photo: t.photo ?? null,
  type: t.type,
  brand: t.brand,
  model: t.model,
  serial_number: t.serialNumber,
  group: t.group,
  home_location: t.homeLocation,
  status: t.status,
  assigned_to: t.assignedTo ?? null,
  issues: t.issues ?? [],
  source: t.source,
});

export const docToTool = (d: QueryDocumentSnapshot<DocumentData>): Tool => {
  const data = d.data();
  return {
    id: d.id,
    code: data.code ?? undefined,
    photo: data.photo ?? undefined,
    type: data.type,
    brand: data.brand,
    model: data.model,
    serialNumber: data.serial_number,
    group: data.group,
    homeLocation: data.home_location,
    status: data.status,
    assignedTo: data.assigned_to ?? null,
    issues: data.issues ?? [],
    source: data.source ?? "manual",
  };
};

export const workerToDoc = (w: Omit<Worker, "id">) => ({
  name: w.name,
  branch: w.branch,
  employee_id: w.employeeId ?? null,
  source: w.source,
});

export const docToWorker = (d: QueryDocumentSnapshot<DocumentData>): Worker => {
  const data = d.data();
  return {
    id: d.id,
    name: data.name,
    branch: data.branch,
    employeeId: data.employee_id ?? undefined,
    source: data.source ?? "manual",
  };
};

export const loanToDoc = (l: Omit<Loan, "id">) => ({
  tool_id: l.toolId,
  worker_id: l.workerId,
  checkout_date: l.checkoutDate,
  checkout_condition: l.checkoutCondition,
  expected_return_date: l.expectedReturnDate ?? null,
  checkout_note: l.checkoutNote ?? null,
  checkout_photo: l.checkoutPhoto ?? null,
  return_date: l.returnDate ?? null,
  return_condition: l.returnCondition ?? null,
  return_photo: l.returnPhoto ?? null,
  shop_manager: l.shopManager,
  return_shop_manager: l.returnShopManager ?? null,
  worker_confirmed_at: l.workerConfirmedAt ?? null,
  return_worker_confirmed_at: l.returnWorkerConfirmedAt ?? null,
});

export const docToLoan = (d: QueryDocumentSnapshot<DocumentData>): Loan => {
  const data = d.data();
  return {
    id: d.id,
    toolId: data.tool_id,
    workerId: data.worker_id,
    checkoutDate: data.checkout_date,
    checkoutCondition: data.checkout_condition,
    expectedReturnDate: data.expected_return_date ?? undefined,
    checkoutNote: data.checkout_note ?? undefined,
    checkoutPhoto: data.checkout_photo ?? undefined,
    returnDate: data.return_date ?? null,
    returnCondition: data.return_condition ?? null,
    returnPhoto: data.return_photo ?? null,
    shopManager: data.shop_manager,
    returnShopManager: data.return_shop_manager ?? null,
    workerConfirmedAt: data.worker_confirmed_at ?? undefined,
    returnWorkerConfirmedAt: data.return_worker_confirmed_at ?? null,
  };
};

export const supplyToDoc = (s: Omit<Supply, "id">) => ({
  name: s.name,
  current_quantity: s.currentQuantity,
  reorder_point: s.reorderPoint,
  unit: s.unit,
  supplier: s.supplier ?? null,
  cost: s.cost ?? null,
  category: s.category ?? null,
});

export const docToSupply = (d: QueryDocumentSnapshot<DocumentData>): Supply => {
  const data = d.data();
  return {
    id: d.id,
    name: data.name,
    currentQuantity: data.current_quantity,
    reorderPoint: data.reorder_point,
    unit: data.unit,
    supplier: data.supplier ?? undefined,
    cost: data.cost ?? undefined,
    category: data.category ?? undefined,
  };
};

export const trailerToDoc = (t: Omit<Trailer, "id">) => ({
  name: t.name,
  supplies: t.supplies.map((s) => ({ supply_id: s.supplyId, quantity: s.quantity })),
  assigned_worker_id: t.assignedWorkerId ?? null,
});

export const docToTrailer = (d: QueryDocumentSnapshot<DocumentData>): Trailer => {
  const data = d.data();
  const supplies: TrailerSupply[] = (data.supplies ?? []).map((s: { supply_id: string; quantity: number }) => ({
    supplyId: s.supply_id,
    quantity: s.quantity,
  }));
  return {
    id: d.id,
    name: data.name,
    supplies,
    assignedWorkerId: data.assigned_worker_id ?? null,
  };
};

export const trailerInventoryRecordToDoc = (r: Omit<TrailerInventoryRecord, "id">) => ({
  trailer_id: r.trailerId,
  trailer_name: r.trailerName,
  date: r.date,
  generated_by: r.generatedBy ?? null,
  received_by_signed_at: r.receivedBySignedAt ?? null,
  manager_signed_at: r.managerSignedAt ?? null,
  pdf_data: r.pdfData,
});

export const docToTrailerInventoryRecord = (d: QueryDocumentSnapshot<DocumentData>): TrailerInventoryRecord => {
  const data = d.data();
  return {
    id: d.id,
    trailerId: data.trailer_id,
    trailerName: data.trailer_name,
    date: data.date,
    generatedBy: data.generated_by ?? undefined,
    receivedBySignedAt: data.received_by_signed_at ?? undefined,
    managerSignedAt: data.manager_signed_at ?? undefined,
    pdfData: data.pdf_data,
  };
};

export const docToShopManager = (d: QueryDocumentSnapshot<DocumentData>): ShopManager => {
  const data = d.data();
  return { id: d.id, name: data.name, pin: data.pin };
};

export const shopManagerToDoc = (m: Omit<ShopManager, "id">) => ({ name: m.name, pin: m.pin });

export const movementToDoc = (m: Omit<SupplyMovement, "id">) => ({
  supply_id: m.supplyId,
  type: m.type,
  quantity: m.quantity,
  date: m.date,
  note: m.note ?? null,
  shop_manager: m.shopManager,
  worker_id: m.workerId ?? null,
});

export const docToMovement = (d: QueryDocumentSnapshot<DocumentData>): SupplyMovement => {
  const data = d.data();
  return {
    id: d.id,
    supplyId: data.supply_id,
    type: data.type,
    quantity: data.quantity,
    date: data.date,
    note: data.note ?? undefined,
    shopManager: data.shop_manager,
    workerId: data.worker_id ?? undefined,
  };
};
