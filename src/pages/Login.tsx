import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../lib/auth";
import { repository } from "../data";
import { isFirebaseConfigured } from "../lib/firebase";
import type { ShopManager } from "../types/models";
import logo from "../assets/logo.webp";

export function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const [managers, setManagers] = useState<ShopManager[]>([]);
  // Track readiness separately from `managers` — an empty list could mean
  // "still loading" or "genuinely no managers", and submitting a correct PIN
  // during that window was reading the PIN as wrong (see the race fixed in
  // firestoreRepository's subscribeWithAuth).
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => repository.subscribeShopManagers((list) => { setManagers(list); setReady(true); }), []);

  const press = (digit: string) => {
    setError("");
    if (pin.length >= 6) return;
    setPin((p) => p + digit);
  };

  const submit = () => {
    if (!ready) {
      setError("Loading, try again in a moment…");
      return;
    }
    const match = managers.find((m) => m.pin === pin);
    if (match) {
      signIn(match);
      navigate("/", { replace: true });
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-warm px-6">
      <img src={logo} alt="Green Grass" className="h-24 w-24" />
      <h1 className="mt-4 text-2xl font-bold text-brand-dark">Shop Inventory</h1>
      <p className="mt-1 text-sm text-text-secondary">Sign in to continue</p>

      <div className="mt-8 flex gap-3">
        {/* Manager PINs can be 4–6 digits (Settings) — grow past 4 dots as typed. */}
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 border-brand-dark ${pin.length > i ? "bg-brand-dark" : "bg-transparent"}`}
          />
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-error">{error}</p>}

      <div className="mt-8 grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 w-16 rounded-full bg-white text-xl font-semibold text-brand-dark shadow-[0_2px_8px_rgba(45,60,57,0.06)] active:bg-bg-olive-light"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="h-16 w-16 rounded-full text-lg font-semibold text-text-secondary"
        >
          ⌫
        </button>
        <button
          onClick={() => press("0")}
          className="h-16 w-16 rounded-full bg-white text-xl font-semibold text-brand-dark shadow-[0_2px_8px_rgba(45,60,57,0.06)] active:bg-bg-olive-light"
        >
          0
        </button>
        <span />
      </div>

      <Button size="lg" className="mt-8 w-64" onClick={submit} disabled={pin.length === 0}>
        Sign In
      </Button>

      {!isFirebaseConfigured && <p className="mt-6 text-xs text-text-disabled">Demo PIN: 1234</p>}
    </div>
  );
}
