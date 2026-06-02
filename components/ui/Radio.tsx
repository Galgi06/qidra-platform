import type { InputHTMLAttributes, ReactNode } from "react";

type RadioProps = InputHTMLAttributes<HTMLInputElement> & {
  children: ReactNode;
};

export function Radio({ children, ...props }: RadioProps) {
  return (
    <label className="flex items-center gap-3 text-14 text-qidra-grayBlue">
      <input className="size-4 accent-qidra-accent" type="radio" {...props} />
      <span>{children}</span>
    </label>
  );
}
