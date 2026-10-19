import { useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

// text-base (16px), not smaller: iOS Safari zooms the page on focus into any
// input under 16px and doesn't zoom back out on blur.
const base =
  "w-full rounded-[11px] border border-border-subtle bg-white px-3.5 h-11 text-base text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-olive";

// Most fields in this app are an ID, PIN, code, or quantity, so plain text
// inputs open the numeric keypad by default — with a tap to switch to the
// letter keyboard for the fields that need it (name, brand, etc). Skipped
// for inputs that already pick their own type or inputMode (number, date,
// digit-only PIN fields, ...), since those already know what they want.
export function Input({ className, inputMode, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [letters, setLetters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if ((type && type !== "text") || inputMode) {
    return <input {...props} type={type} inputMode={inputMode} className={`${base} ${className ?? ""}`} />;
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode={letters ? "text" : "numeric"}
        className={`${base} pr-14`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          setLetters((v) => !v);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md border border-border-subtle bg-bg-warm px-1.5 py-1 text-[10px] font-semibold text-text-secondary"
      >
        {letters ? "123" : "ABC"}
      </button>
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} h-auto min-h-24 py-2.5 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-text-secondary">{children}</label>;
}
