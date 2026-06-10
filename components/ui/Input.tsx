import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ label, error, hint, className = "", ...props }: InputProps) {
  return (
    <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
      <span>{label}</span>
      <input
        className={`field-shell h-12 rounded-qidra px-4 text-16 outline-none placeholder:text-qidra-grayMedium ${
          error ? "border-qidra-red bg-red-50/30" : ""
        } ${className}`}
        {...props}
      />
      {hint ? <span className="text-12 leading-snug text-qidra-grayBlue">{hint}</span> : null}
      {error ? <span className="text-12 text-qidra-red">{error}</span> : null}
    </label>
  );
}
