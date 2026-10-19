import { NavLink } from "react-router-dom";
import { Home, Wrench, ClipboardList, Package, Trailer, BarChart3, Settings } from "lucide-react";
import { useAuth } from "../../lib/auth";
import logo from "../../assets/logo.webp";

const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/tools", label: "Tools", Icon: Wrench },
  { to: "/loans", label: "Loans", Icon: ClipboardList },
  { to: "/supplies", label: "Supplies", Icon: Package },
  { to: "/trailers", label: "Trailers", Icon: Trailer },
  { to: "/reports", label: "Reports", Icon: BarChart3 },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export function Sidebar() {
  const { manager, signOut } = useAuth();
  return (
    <aside className="hidden h-screen w-[250px] shrink-0 flex-col border-r border-border-subtle bg-white md:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <img src={logo} alt="Green Grass" className="h-10 w-10" />
        <div>
          <p className="text-sm font-semibold text-brand-dark leading-tight">Green Grass</p>
          <p className="text-xs text-text-secondary leading-tight">Shop Inventory</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[15px] font-medium transition-colors ${
                isActive ? "bg-bg-olive-light text-brand-dark" : "text-text-secondary hover:bg-bg-warm"
              }`
            }
          >
            <item.Icon size={18} strokeWidth={2} aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border-subtle px-4 py-4">
        <p className="text-sm font-semibold text-text-primary">{manager?.name ?? "Shop Manager"}</p>
        <button onClick={signOut} className="mt-1 text-sm text-text-secondary hover:text-error">
          Sign out
        </button>
      </div>
    </aside>
  );
}
