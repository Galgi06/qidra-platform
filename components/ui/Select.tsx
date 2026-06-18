import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
};

export function Select({ label, options, error, className = "", ...props }: SelectProps) {
  return (
    <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
      <span>{label}</span>
      <select
        className={`field-shell h-12 rounded-qidra px-4 text-16 outline-none ${
          error ? "border-qidra-red bg-red-50/30" : ""
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-12 text-qidra-red">{error}</span> : null}
    </label>
  );
}
