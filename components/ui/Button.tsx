import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "dark" | "white" | "outline";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center rounded-qidra border text-16 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "border-qidra-accent bg-qidra-accent text-white hover:bg-qidra-accent80",
  dark: "border-qidra-dark bg-qidra-dark text-white hover:bg-qidra-grayBlueDark",
  white: "border-white bg-white text-qidra-dark hover:bg-qidra-grayLight",
  outline: "border-qidra-grayMedium bg-transparent text-qidra-dark hover:border-qidra-accent hover:text-qidra-accent"
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4",
  md: "h-12 px-6"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, children, className = "", ...props }: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? "Loading" : children}
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
