import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {label}
      <input
        className={`h-12 rounded-qidra border bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent ${
          error ? "border-qidra-red" : "border-transparent"
        } ${className}`}
        {...props}
      />
      {error ? <span className="text-12 text-qidra-red">{error}</span> : null}
    </label>
  );
}
