import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Toast } from "../ui/Toast";
import { isFirebaseConfigured } from "../../lib/firebase";
import { DataProvider, useDataReady, useShopManagers } from "../../hooks/useData";
import { useAuth } from "../../lib/auth";

// The signed-in Shop Manager is a snapshot saved at login. Keep it in step
// with Settings: a deleted manager is signed out, and a rename or PIN change
// is picked up (the name is stamped on every loan/return they record).
function SessionGuard() {
  const { manager, signIn, signOut } = useAuth();
  const managers = useShopManagers();
  const ready = useDataReady();

  useEffect(() => {
    // An empty list is far more likely "nothing cached yet / offline" than
    // "every manager was deleted" — never sign anyone out on that alone.
    if (!ready || !manager || managers.length === 0) return;
    const current = managers.find((m) => m.id === manager.id);
    if (!current) signOut();
    else if (current.name !== manager.name || current.pin !== manager.pin) signIn(current);
  }, [ready, managers, manager, signIn, signOut]);

  return null;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  // Stable so the Toast's auto-dismiss timer isn't restarted by unrelated
  // re-renders here (e.g. the online/offline banner toggling).
  const dismissToast = useCallback(() => setToast(null), []);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const state = location.state as { toast?: string } | null;
    if (state?.toast) {
      setToast(state.toast);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  return (
    <DataProvider>
      <SessionGuard />
      <div className="flex min-h-screen bg-bg-warm">
        <Sidebar />
        <main className="min-w-0 flex-1 pt-[env(safe-area-inset-top,0px)]">
          {!isFirebaseConfigured && (
            <div className="bg-warning/15 px-6 py-2 text-center text-sm font-medium text-warning">
              Demo mode — data is saved only in this browser. Configure Firebase in .env to use real Firestore.
            </div>
          )}
          {isFirebaseConfigured && !online && (
            <div className="bg-warning/15 px-6 py-2 text-center text-sm font-medium text-warning">
              You're offline — changes will save and sync automatically once you're back online.
            </div>
          )}
          <div className="mx-auto max-w-6xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 md:pb-8">
            <Outlet />
          </div>
        </main>
        <BottomNav />
        {toast && <Toast message={toast} onDone={dismissToast} />}
      </div>
    </DataProvider>
  );
}
