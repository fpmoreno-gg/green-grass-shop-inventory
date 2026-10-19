import type { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`rounded-[14px] border border-border-subtle bg-white p-4 shadow-[0_2px_8px_rgba(45,60,57,0.06)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
