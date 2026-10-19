import type { DataRepository } from "../types";
import { Collection, newId } from "./store";
import {
  seedLoans,
  seedMovements,
  seedShopManagers,
  seedSupplies,
  seedTools,
  seedTrailers,
  seedWorkers,
} from "./seed";
import type { Loan, ShopManager, Supply, SupplyMovement, Tool, Trailer, TrailerInventoryRecord, Worker } from "../../types/models";

const tools = new Collection<Tool>("tools", seedTools);
const workers = new Collection<Worker>("workers", seedWorkers);
const loans = new Collection<Loan>("loans", seedLoans);
const supplies = new Collection<Supply>("supplies", seedSupplies);
const movements = new Collection<SupplyMovement>("supply_movements", seedMovements);
const trailers = new Collection<Trailer>("trailers", seedTrailers);
const shopManagers = new Collection<ShopManager>("shop_managers", seedShopManagers);
const trailerInventoryRecords = new Collection<TrailerInventoryRecord>("trailer_inventory_records", []);

export const localRepository: DataRepository = {
  subscribeTools: (cb) => tools.subscribe(cb),
  getTool: async (id) => tools.get(id),
  getToolPhoto: async (id) => tools.get(id)?.photo,
  addTool: async (tool) => {
    const id = newId();
    tools.add({ ...tool, id, issues: [] });
    return id;
  },
  updateTool: async (id, patch) => tools.update(id, patch),
  addToolIssue: async (id, issue) => {
    const tool = tools.get(id);
    if (!tool) return;
    tools.update(id, { issues: [...tool.issues, { ...issue, id: newId() }] });
  },

  subscribeWorkers: (cb) => workers.subscribe(cb),
  addWorker: async (worker) => {
    const id = newId();
    workers.add({ ...worker, id });
    return id;
  },

  subscribeLoans: (cb) => loans.subscribe(cb),
  createLoan: async (loan) => {
    const id = newId();
    loans.add({ ...loan, id });
    tools.update(loan.toolId, { status: "checked_out", assignedTo: loan.workerId });
    return id;
  },
  returnLoan: async (id, patch) => {
    const loan = loans.get(id);
    loans.update(id, patch);
    if (loan) {
      const alreadyInRepair = tools.get(loan.toolId)?.status === "repair";
      const nextStatus = patch.returnCondition === "needs_repair" || alreadyInRepair ? "repair" : "available";
      tools.update(loan.toolId, { status: nextStatus, assignedTo: null });
    }
  },

  subscribeSupplies: (cb) => supplies.subscribe(cb),
  getSupplyPhoto: async (id) => supplies.get(id)?.photo,
  addSupply: async (supply) => {
    const id = newId();
    supplies.add({ ...supply, id });
    return id;
  },
  adjustSupply: async (id, delta, movement) => {
    const supply = supplies.get(id);
    if (!supply) return;
    supplies.update(id, { currentQuantity: supply.currentQuantity + delta });
    movements.add({ ...movement, id: newId(), supplyId: id });
  },
  subscribeSupplyMovements: (cb) => movements.subscribe(cb),

  subscribeTrailers: (cb) => trailers.subscribe(cb),
  addTrailer: async (trailer) => {
    const id = newId();
    trailers.add({ ...trailer, id });
    return id;
  },
  updateTrailer: async (id, patch) => trailers.update(id, patch),
  addTrailerInventoryRecord: async (record) => {
    const id = newId();
    trailerInventoryRecords.add({ ...record, id });
    return id;
  },
  getTrailerInventoryRecords: async (trailerId) =>
    trailerInventoryRecords
      .all()
      .filter((r) => r.trailerId === trailerId)
      .sort((a, b) => b.date.localeCompare(a.date)),

  subscribeShopManagers: (cb) => shopManagers.subscribe(cb),
  addShopManager: async (manager) => {
    const id = newId();
    shopManagers.add({ ...manager, id });
    return id;
  },
  updateShopManager: async (id, patch) => shopManagers.update(id, patch),
  deleteShopManager: async (id) => shopManagers.delete(id),
};
