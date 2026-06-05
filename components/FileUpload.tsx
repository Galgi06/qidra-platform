"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";

type FileUploadProps = InputHTMLAttributes<HTMLInputElement> & {
  existingFileName?: string | null;
  existingLabel?: string;
  hint?: string;
  label: string;
  manyFilesLabel?: string;
  selectedLabel?: string;
};

export function FileUpload({
  existingFileName,
  existingLabel = "Uploaded",
  hint = "PDF, JPG, PNG",
  label,
  manyFilesLabel = "files",
  onChange,
  selectedLabel = "Selected",
  ...props
}: FileUploadProps) {
  const [selectedText, setSelectedText] = useState("");
  const activeText = selectedText || existingFileName || "";
  const statusLabel = selectedText ? selectedLabel : existingLabel;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;

    if (!files?.length) {
      setSelectedText("");
    } else if (files.length === 1) {
      setSelectedText(files[0]?.name ?? "");
    } else {
      setSelectedText(`${files.length} ${manyFilesLabel}`);
    }

    onChange?.(event);
  }

  return (
    <label className="surface grid cursor-pointer gap-3 border-dashed p-5 text-14 text-qidra-grayBlue transition-colors hover:border-qidra-accent">
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium text-qidra-dark">{label}</span>
        {activeText ? <CheckIcon /> : null}
      </span>
      <span>{hint}</span>
      {activeText ? (
        <span className="rounded-[10px] bg-white px-3 py-2 text-13 font-medium text-qidra-green shadow-[0_0_0_1px_rgba(58,148,97,0.18)]">
          {statusLabel}: <span className="text-qidra-dark">{activeText}</span>
        </span>
      ) : null}
      <input accept=".pdf,.jpg,.jpeg,.png" type="file" className="sr-only" onChange={handleChange} {...props} />
    </label>
  );
}

function CheckIcon() {
  return (
    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-qidra-green text-white">
      <svg className="size-4" fill="none" viewBox="0 0 16 16">
        <path d="m3.5 8.2 2.8 2.8 6.2-6.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </span>
  );
}
