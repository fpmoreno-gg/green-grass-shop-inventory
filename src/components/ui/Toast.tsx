import { useEffect } from "react";

// 60px below mirrors BottomNav's BOTTOM_NAV_CONTENT_HEIGHT — Tailwind needs
// the literal value in the class string, so keep the two in sync by hand.
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom,0px)+12px)] z-50 flex justify-center px-4 md:bottom-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <span>✅</span>
        {message}
      </div>
    </div>
  );
}
