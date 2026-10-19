import { useRef, useState } from "react";

// Numeric keypad by default (search here is primarily by PIN/ID/code), with
// a tap on "ABC" to switch to the letter keyboard for a type/brand search.
export function SearchBar({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [letters, setLetters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">🔍</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={letters ? "text" : "numeric"}
        className="h-12 w-full overflow-hidden text-ellipsis rounded-[11px] border border-border-subtle bg-white pl-10 pr-14 text-base placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-olive"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          setLetters((v) => !v);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-border-subtle bg-bg-warm px-1.5 py-1 text-[10px] font-semibold text-text-secondary"
      >
        {letters ? "123" : "ABC"}
      </button>
    </div>
  );
}
