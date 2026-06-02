import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
};

export function Select({ label, options, error, className = "", ...props }: SelectProps) {
  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {label}
      <select
        className={`h-12 rounded-qidra border bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent ${
          error ? "border-qidra-red" : "border-transparent"
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
