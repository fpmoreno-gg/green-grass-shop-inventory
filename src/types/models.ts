// Shared data model — mirrors the Firestore collections defined in the spec
// (tools, workers, loans, supplies, trailers). Field names are camelCase here
// and mapped to the spec's snake_case Firestore field names in the data layer.

export type ToolStatus = "available" | "checked_out" | "repair" | "retired";
export type CheckoutCondition = "good" | "minor_damage" | "damaged";
export type ReturnCondition = "good" | "damaged" | "needs_repair";

export interface ToolIssue {
  id: string;
  note: string;
  photo?: string;
  date: string; // ISO timestamp
  userId: string;
}

// Where a record came from. "manual" = added through this app's own forms
// (small tools not tracked in Trellis; workers typed in at Settings).
// "trellis" = synced read-only from Trellis once that integration exists —
// large machinery, and worker identities, never created/edited here.
// Until the real integration exists, Trellis data is simulated: records
// marked "trellis" are test fixtures standing in for its future API output.
export type DataSource = "manual" | "trellis";

export interface Tool {
  id: string;
  // Short human-facing identifier (e.g. "0001") — the primary way tools are
  // looked up in the field, same role as Worker.employeeId. Not the Firestore
  // doc id, which is long and not practical to type/read on a phone.
  code?: string;
  photo?: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  group: string;
  homeLocation: string;
  status: ToolStatus;
  assignedTo?: string | null; // worker id
  issues: ToolIssue[];
  source: DataSource;
}

export interface Worker {
  id: string;
  name: string;
  branch: string;
  // Reference ID only (e.g. the Trellis worker id) — NOT a login credential.
  // The app's own login stays the single Shop Manager PIN (see ShopManager).
  employeeId?: string;
  source: DataSource;
}

export interface Loan {
  id: string;
  toolId: string;
  workerId: string;
  checkoutDate: string; // ISO timestamp
  checkoutCondition: CheckoutCondition;
  // When the tool is expected back (ISO date, "YYYY-MM-DD") — set at checkout
  // so staff can tell at a glance if a loan is overdue.
  expectedReturnDate?: string;
  checkoutNote?: string;
  checkoutPhoto?: string;
  returnDate?: string | null;
  returnCondition?: ReturnCondition | null;
  returnPhoto?: string | null;
  // Shop Manager who recorded the checkout. Separate from returnShopManager
  // below since a different manager often handles the return.
  shopManager: string;
  returnShopManager?: string | null;
  // The worker confirms their own side of the handoff by entering their PIN
  // on the Shop Manager's device at the moment of exchange — proof the
  // worker was actually present, not just the Shop Manager's word for it.
  // Unset when the worker has no PIN on file (confirmation is skipped, not
  // blocked, so missing setup never stops a loan/return from being logged).
  workerConfirmedAt?: string;
  returnWorkerConfirmedAt?: string | null;
}

export type SupplyCategory = "hand_tools" | "misc_equipment";

export interface Supply {
  id: string;
  name: string;
  currentQuantity: number;
  reorderPoint: number;
  unit: string;
  supplier?: string;
  cost?: number;
  // Stored outside the main supply doc (see DataRepository.getSupplyPhoto),
  // same reasoning as tool photos — keeps the list subscription light.
  photo?: string;
  category?: SupplyCategory;
}

export interface TrailerSupply {
  supplyId: string;
  // How many of this supply this trailer carries in its own loadout — a
  // separate count from Supply.currentQuantity (the shop's total stock).
  // Adding/removing a trailer supply never touches the shop total.
  quantity: number;
}

export interface Trailer {
  id: string;
  name: string;
  // Which tools "belong" to this trailer is derived live from Tool.assignedTo
  // matching assignedWorkerId below (see TrailerDetail/Trailers pages) —
  // not stored here, so it can't drift out of sync with actual assignments.
  supplies: TrailerSupply[];
  assignedWorkerId?: string | null;
}

// Not in the original spec tables, but required by the Login/PIN screen and
// the "Shop Manager" identity shown in the sidebar — the person who performs
// check-outs/returns (stored as `loans.shop_manager`).
export interface ShopManager {
  id: string;
  name: string;
  pin: string;
}

// A saved, signed snapshot of a trailer's printable inventory PDF. Stores the
// rendered PDF itself (not just the data used to build it) so a historical
// record stays exactly as it was signed even if the trailer's tools/supplies
// change afterward.
export interface TrailerInventoryRecord {
  id: string;
  trailerId: string;
  trailerName: string;
  date: string; // ISO timestamp, when the record was saved
  generatedBy?: string; // shop manager who saved it
  receivedBySignedAt?: string;
  managerSignedAt?: string;
  pdfData: string; // base64-encoded PDF bytes
}

export interface SupplyMovement {
  id: string;
  supplyId: string;
  type: "in" | "out";
  quantity: number;
  date: string;
  note?: string;
  shopManager: string;
  // Who actually took the consumable (required for "out" so usage can be
  // traced back to a person, not just the shop manager who recorded it).
  workerId?: string;
}
