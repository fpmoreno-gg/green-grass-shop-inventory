import { NavLink } from "react-router-dom";
import { Home, Wrench, ClipboardList, Package, MoreHorizontal } from "lucide-react";

// Mobile-first bottom navigation (spec section 7: "mobile-first… with bottom
// navigation"). Mirrors the iOS tab bar grouping: Home, Tools, Loans,
// Supplies, and a "More" overflow for the rest.
const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/tools", label: "Tools", Icon: Wrench },
  { to: "/loans", label: "Loans", Icon: ClipboardList },
  { to: "/supplies", label: "Supplies", Icon: Package },
  { to: "/more", label: "More", Icon: MoreHorizontal },
];

// Fixed, deterministic content height (not grown from padding/line-height,
// which drift slightly across browsers) so other fixed-bottom UI — the
// wizard footers, the toast — can line up against it exactly via
// BOTTOM_NAV_CONTENT_HEIGHT without a persistent gap. Total rendered height
// is this plus the safe-area inset, applied below as extra bottom padding.
export const BOTTOM_NAV_CONTENT_HEIGHT = 60;

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border-subtle bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex" style={{ height: BOTTOM_NAV_CONTENT_HEIGHT }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? "text-brand-dark" : "text-text-secondary"
              }`
            }
          >
            <item.Icon size={22} strokeWidth={2} aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
