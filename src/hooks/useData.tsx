import { createContext, useContext, useMemo, type ReactNode } from "react";
import { repository } from "../data";
import { useCollection } from "./useCollection";
import type { Loan, ShopManager, Supply, SupplyMovement, Tool, Trailer, Worker } from "../types/models";

// All live collections, subscribed exactly once per login session (see
// DataProvider below) and shared through context. Before this, every page's
// useTools()/useTrailers()/etc. opened its OWN onSnapshot subscription on
// mount and tore it down on unmount — so navigating into Tools re-fetched
// and re-deserialized all ~1,900 tool docs from scratch every single time,
// which is what made screens feel slow to open. Subscribing once at the
// AppLayout level (which stays mounted across route changes) means
// navigation just reads already-loaded state instead of re-subscribing.
interface DataContextValue {
  tools: Tool[];
  workers: Worker[];
  loans: Loan[];
  supplies: Supply[];
  supplyMovements: SupplyMovement[];
  trailers: Trailer[];
  shopManagers: ShopManager[];
  // True once every collection has delivered its first snapshot. Pages that
  // do `collection.find(id)` right after mount need this — an empty array
  // (not loaded yet) and "no such id" (loaded, genuinely missing) both look
  // like `undefined` from .find(), so without this flag a detail page
  // flashes "not found" for every visit until the subscription catches up.
  ready: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [tools, toolsReady] = useCollection<Tool>(repository.subscribeTools);
  const [workers, workersReady] = useCollection<Worker>(repository.subscribeWorkers);
  const [loans, loansReady] = useCollection<Loan>(repository.subscribeLoans);
  const [supplies, suppliesReady] = useCollection<Supply>(repository.subscribeSupplies);
  const [supplyMovements, supplyMovementsReady] = useCollection<SupplyMovement>(repository.subscribeSupplyMovements);
  const [trailers, trailersReady] = useCollection<Trailer>(repository.subscribeTrailers);
  const [shopManagers, shopManagersReady] = useCollection<ShopManager>(repository.subscribeShopManagers);

  const ready =
    toolsReady && workersReady && loansReady && suppliesReady && supplyMovementsReady && trailersReady && shopManagersReady;
  // Memoized so a re-render of the layout around this provider (a toast, the
  // offline banner) doesn't re-render every page reading ~1,900 tools.
  const value = useMemo<DataContextValue>(
    () => ({ tools, workers, loans, supplies, supplyMovements, trailers, shopManagers, ready }),
    [tools, workers, loans, supplies, supplyMovements, trailers, shopManagers, ready],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData hooks must be used within <DataProvider>");
  return ctx;
}

export const useTools = () => useDataContext().tools;
export const useWorkers = () => useDataContext().workers;
export const useLoans = () => useDataContext().loans;
export const useSupplies = () => useDataContext().supplies;
export const useSupplyMovements = () => useDataContext().supplyMovements;
export const useTrailers = () => useDataContext().trailers;
export const useShopManagers = () => useDataContext().shopManagers;
// For detail pages doing `collection.find(id)` — see the `ready` comment above.
export const useDataReady = () => useDataContext().ready;
