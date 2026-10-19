import { Link } from "react-router-dom";
import { BarChart3, Settings } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../lib/auth";

// Mobile-only landing for the "More" tab (spec: Reports / Settings). Trailers
// has its own entry point from the Tools page header, so it's not duplicated
// here. Desktop users reach these same pages directly from the sidebar.
const items = [
  { to: "/reports", label: "Reports", Icon: BarChart3 },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export function More() {
  const { manager, signOut } = useAuth();
  return (
    <div className="space-y-5 pb-4 md:hidden">
      <h1 className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 bg-bg-warm px-4 pb-4 text-[28px] font-semibold text-brand-dark will-change-transform sm:-mx-6 sm:px-6">More</h1>
      <div className="space-y-2">
        {items.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="flex items-center gap-3">
              <item.Icon size={20} strokeWidth={2} className="text-brand-dark" aria-hidden />
              <span className="font-medium">{item.label}</span>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="flex items-center justify-between">
        <span className="font-medium">{manager?.name ?? "Shop Manager"}</span>
        <button onClick={signOut} className="text-sm text-error">
          Sign out
        </button>
      </Card>
    </div>
  );
}
