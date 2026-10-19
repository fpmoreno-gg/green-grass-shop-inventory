import type {
  Loan,
  ShopManager,
  Supply,
  SupplyMovement,
  Tool,
  ToolIssue,
  Trailer,
  TrailerInventoryRecord,
  Worker,
} from "../types/models";

// Repository contract. Two implementations exist (see ./local and ./firestore)
// so the same UI code runs against a real Firestore project or against an
// in-browser demo store when no Firebase project is configured yet.
export interface DataRepository {
  // Tools
  subscribeTools(cb: (tools: Tool[]) => void): () => void;
  getTool(id: string): Promise<Tool | undefined>;
  addTool(tool: Omit<Tool, "id" | "issues">): Promise<string>;
  updateTool(id: string, patch: Partial<Tool>): Promise<void>;
  addToolIssue(id: string, issue: Omit<ToolIssue, "id">): Promise<void>;
  // Tool photos live outside the main tool document (see firestoreRepository)
  // so the catalog list — and everything else that subscribes to all tools —
  // doesn't pull every photo over the wire. Fetched on demand by screens that
  // actually display one, e.g. the tool detail page.
  getToolPhoto(id: string): Promise<string | undefined>;

  // Workers
  subscribeWorkers(cb: (workers: Worker[]) => void): () => void;
  addWorker(worker: Omit<Worker, "id">): Promise<string>;

  // Loans
  subscribeLoans(cb: (loans: Loan[]) => void): () => void;
  createLoan(loan: Omit<Loan, "id">): Promise<string>;
  returnLoan(
    id: string,
    patch: Pick<Loan, "returnDate" | "returnCondition" | "returnPhoto" | "returnShopManager" | "returnWorkerConfirmedAt">,
  ): Promise<void>;

  // Supplies
  subscribeSupplies(cb: (supplies: Supply[]) => void): () => void;
  addSupply(supply: Omit<Supply, "id">): Promise<string>;
  adjustSupply(id: string, delta: number, movement: Omit<SupplyMovement, "id" | "supplyId">): Promise<void>;
  subscribeSupplyMovements(cb: (movements: SupplyMovement[]) => void): () => void;
  // Same split as getToolPhoto — see that comment above.
  getSupplyPhoto(id: string): Promise<string | undefined>;

  // Trailers
  subscribeTrailers(cb: (trailers: Trailer[]) => void): () => void;
  addTrailer(trailer: Omit<Trailer, "id">): Promise<string>;
  updateTrailer(id: string, patch: Partial<Trailer>): Promise<void>;
  // Signed inventory PDF history — fetched on demand per trailer (not
  // globally subscribed), same reasoning as tool/supply photos: each record
  // embeds a full rendered PDF, too heavy to pull into a live list.
  addTrailerInventoryRecord(record: Omit<TrailerInventoryRecord, "id">): Promise<string>;
  getTrailerInventoryRecords(trailerId: string): Promise<TrailerInventoryRecord[]>;

  // Shop managers (PIN login)
  subscribeShopManagers(cb: (managers: ShopManager[]) => void): () => void;
  addShopManager(manager: Omit<ShopManager, "id">): Promise<string>;
  updateShopManager(id: string, patch: Partial<ShopManager>): Promise<void>;
  deleteShopManager(id: string): Promise<void>;
}

export type Unsubscribe = () => void;
