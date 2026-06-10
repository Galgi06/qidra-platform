import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "dark" | "white" | "outline";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center rounded-qidra border text-16 font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-qidra-accent/15 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "border-qidra-accent bg-qidra-accent text-white shadow-[0_12px_30px_rgba(79,70,229,0.22)] hover:bg-qidra-accent80 hover:shadow-[0_16px_36px_rgba(79,70,229,0.28)]",
  dark: "border-qidra-dark bg-qidra-dark text-white shadow-[0_12px_28px_rgba(18,20,23,0.14)] hover:bg-qidra-grayBlueDark",
  white: "border-white bg-white text-qidra-dark shadow-[0_12px_30px_rgba(18,20,23,0.12)] hover:bg-qidra-grayLight",
  outline: "border-qidra-grayMedium/70 bg-white text-qidra-dark hover:border-qidra-accent hover:text-qidra-accent hover:shadow-[0_12px_28px_rgba(18,20,23,0.07)]"
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4",
  md: "h-12 px-6"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, loadingLabel = "Loading", children, className = "", ...props }: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? loadingLabel : children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({ href, children, variant = "primary", size = "md", className = "", ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </Link>
  );
}
