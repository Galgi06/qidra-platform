"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  hint?: string;
  showLabel?: string;
  hideLabel?: string;
};

export function PasswordInput({
  label,
  error,
  hint,
  showLabel = "Show password",
  hideLabel = "Hide password",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      error={error}
      hint={hint}
      label={label}
      trailingAdornment={
        <button
          aria-label={visible ? hideLabel : showLabel}
          className="text-12 font-semibold text-qidra-grayBlue transition-colors hover:text-qidra-accent"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? "Скрыть" : "Показать"}
        </button>
      }
      type={visible ? "text" : "password"}
    />
  );
}
