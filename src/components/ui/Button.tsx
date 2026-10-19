import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "destructive";
type Size = "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-dark text-white hover:bg-[#243330] disabled:bg-text-disabled",
  secondary: "bg-bg-olive-light text-brand-dark hover:bg-[#dcded0] disabled:text-text-disabled",
  outline: "bg-transparent text-brand-dark border border-brand-dark hover:bg-bg-olive-light/40",
  destructive: "bg-error text-white hover:bg-[#a13232] disabled:bg-text-disabled",
};

const sizeClasses: Record<Size, string> = {
  md: "h-11 px-4 text-[15px]",
  lg: "h-[52px] px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
