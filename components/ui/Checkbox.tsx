import type { InputHTMLAttributes, ReactNode } from "react";

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  children: ReactNode;
};

export function Checkbox({ children, ...props }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 text-14 text-qidra-grayBlue">
      <input className="mt-1 size-4 accent-qidra-accent" type="checkbox" {...props} />
      <span>{children}</span>
    </label>
  );
}
