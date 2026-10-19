import type { Loan, ShopManager, Supply, SupplyMovement, Tool, Trailer, Worker } from "../../types/models";

// Sample data so the demo store isn't empty on first run. Replace entirely
// once a real Firebase project is connected (see README "Conectar Firebase").

export const seedTools: Tool[] = [
  {
    id: "tool-1",
    type: "Drill",
    brand: "DeWalt",
    model: "DCD791",
    serialNumber: "DW-10021",
    group: "Power Tools",
    homeLocation: "Main Shop",
    status: "available",
    issues: [],
    source: "trellis",
  },
  {
    id: "tool-2",
    type: "Hedge Trimmer",
    brand: "Stihl",
    model: "HSA 86",
    serialNumber: "ST-55831",
    group: "Trimmers",
    homeLocation: "Main Shop",
    status: "checked_out",
    assignedTo: "worker-1",
    issues: [],
    source: "trellis",
  },
  {
    id: "tool-3",
    type: "Chainsaw",
    brand: "Husqvarna",
    model: "450",
    serialNumber: "HQ-77210",
    group: "Chainsaws",
    homeLocation: "Trailer A",
    status: "repair",
    assignedTo: "worker-3",
    issues: [
      { id: "issue-1", note: "Chain tensioner loose", date: new Date().toISOString(), userId: "shop-1" },
    ],
    source: "trellis",
  },
  {
    id: "tool-4",
    type: "Leaf Blower",
    brand: "Echo",
    model: "PB-580T",
    serialNumber: "EC-33219",
    group: "Blowers",
    homeLocation: "Main Shop",
    status: "available",
    issues: [],
    source: "trellis",
  },
  {
    id: "tool-5",
    type: "Edger",
    brand: "Honda",
    model: "HHE31C",
    serialNumber: "HN-90012",
    group: "Edgers",
    homeLocation: "Trailer B",
    status: "retired",
    issues: [],
    source: "trellis",
  },
  {
    id: "tool-6",
    type: "Hand Pruner",
    brand: "Felco",
    model: "F2",
    serialNumber: "SMALL-0001",
    group: "Hand Tools",
    homeLocation: "Main Shop",
    status: "available",
    issues: [],
    source: "manual",
  },
  {
    id: "tool-7",
    type: "Rake",
    brand: "True Temper",
    model: "Leaf Rake",
    serialNumber: "SMALL-0002",
    group: "Hand Tools",
    homeLocation: "Main Shop",
    status: "available",
    issues: [],
    source: "manual",
  },
];

export const seedWorkers: Worker[] = [
  { id: "worker-1", name: "Carlos Mendoza", branch: "Crew A", source: "manual" },
  { id: "worker-2", name: "Luis Ramirez", branch: "Crew B", source: "manual" },
  { id: "worker-3", name: "Jesus Alvarado", branch: "Crew A", employeeId: "4201", source: "trellis" },
];

export const seedLoans: Loan[] = [
  {
    id: "loan-1",
    toolId: "tool-2",
    workerId: "worker-1",
    checkoutDate: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    checkoutCondition: "good",
    shopManager: "Shop Manager",
  },
];

export const seedSupplies: Supply[] = [
  { id: "supply-1", name: "Trimmer Line .095", currentQuantity: 12, reorderPoint: 10, unit: "spools", supplier: "Stihl Parts", cost: 8.5 },
  { id: "supply-2", name: "2-Cycle Oil Mix", currentQuantity: 3, reorderPoint: 5, unit: "gallons", supplier: "Local Supply Co", cost: 22 },
  { id: "supply-3", name: "Chainsaw Bar Oil", currentQuantity: 20, reorderPoint: 8, unit: "quarts", supplier: "Local Supply Co", cost: 6.75 },
  { id: "supply-4", name: "Safety Glasses", currentQuantity: 2, reorderPoint: 6, unit: "units", supplier: "Grainger", cost: 4.25 },
];

export const seedMovements: SupplyMovement[] = [];

export const seedTrailers: Trailer[] = [
  { id: "trailer-a", name: "Trailer A", supplies: [{ supplyId: "supply-2", quantity: 2 }], assignedWorkerId: "worker-3" },
  { id: "trailer-b", name: "Trailer B", supplies: [{ supplyId: "supply-3", quantity: 1 }], assignedWorkerId: null },
];

export const seedShopManagers: ShopManager[] = [{ id: "shop-1", name: "Shop Manager", pin: "1234" }];
