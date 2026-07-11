import type { InputHTMLAttributes } from "react";
import type { ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  trailingAdornment?: ReactNode;
};

export function Input({ label, error, hint, className = "", trailingAdornment, ...props }: InputProps) {
  return (
    <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
      <span>{label}</span>
      <span className="relative block">
        <input
          className={`field-shell h-12 w-full rounded-qidra px-4 text-16 outline-none placeholder:text-qidra-grayMedium ${
            trailingAdornment ? "pr-14" : ""
          } ${error ? "border-qidra-red bg-red-50/30" : ""} ${className}`}
          {...props}
        />
        {trailingAdornment ? <span className="absolute inset-y-0 right-0 flex items-center pr-4">{trailingAdornment}</span> : null}
      </span>
      {hint ? <span className="text-12 leading-snug text-qidra-grayBlue">{hint}</span> : null}
      {error ? <span className="text-12 text-qidra-red">{error}</span> : null}
    </label>
  );
}
