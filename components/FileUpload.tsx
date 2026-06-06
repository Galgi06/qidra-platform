"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";

type FileUploadProps = InputHTMLAttributes<HTMLInputElement> & {
  addMoreLabel?: string;
  chooseLabel?: string;
  existingFileName?: string | null;
  existingLabel?: string;
  hint?: string;
  label: string;
  manyFilesLabel?: string;
  selectedLabel?: string;
};

export function FileUpload({
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png",
  addMoreLabel,
  chooseLabel,
  existingFileName,
  existingLabel = "Uploaded",
  hint = "PDF, DOCX, XLSX, PPTX, JPG, PNG",
  label,
  manyFilesLabel = "files",
  onChange,
  selectedLabel = "Selected",
  ...props
}: FileUploadProps) {
  const [selectedText, setSelectedText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const activeText = selectedText || existingFileName || "";
  const statusLabel = selectedText ? selectedLabel : existingLabel;
  const isMultiple = Boolean(props.multiple);
  const addMoreText = addMoreLabel ?? (selectedLabel === "Выбрано" ? "Добавить ещё документы" : "Add more documents");
  const chooseText = chooseLabel ?? (selectedLabel === "Выбрано" ? "Выбрать документы" : "Select documents");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;

    if (!files?.length) {
      if (!selectedFiles.length) {
        setSelectedText("");
        setSelectedFiles([]);
      }

      onChange?.(event);
      return;
    }

    const incomingFiles = Array.from(files);
    const nextFiles = isMultiple ? mergeFiles(selectedFiles, incomingFiles) : incomingFiles;

    if (isMultiple && nextFiles.length !== incomingFiles.length) {
      replaceInputFiles(event.currentTarget, nextFiles);
    }

    if (nextFiles.length === 1) {
      setSelectedText(nextFiles[0]?.name ?? "");
    } else {
      setSelectedText(`${nextFiles.length} ${manyFilesLabel}`);
    }

    setSelectedFiles(nextFiles);
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
        <span className="grid gap-2 rounded-[10px] bg-white px-3 py-2 text-13 font-medium text-qidra-green shadow-[0_0_0_1px_rgba(58,148,97,0.18)]">
          <span>
            {statusLabel}: <span className="text-qidra-dark">{activeText}</span>
          </span>
          {selectedFiles.length > 1 ? (
            <span className="grid gap-1 text-qidra-dark">
              {selectedFiles.slice(0, 5).map((file, index) => (
                <span key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="truncate text-12 font-medium text-qidra-grayBlue">
                  {file.name}
                </span>
              ))}
              {selectedFiles.length > 5 ? <span className="text-12 text-qidra-grayBlue">+{selectedFiles.length - 5}</span> : null}
            </span>
          ) : null}
        </span>
      ) : null}
      {isMultiple ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-[10px] bg-qidra-dark px-3 py-2 text-13 font-medium text-white">
          <span aria-hidden="true" className="text-18 leading-none">
            +
          </span>
          {activeText ? addMoreText : chooseText}
        </span>
      ) : null}
      <input accept={accept} type="file" className="sr-only" onChange={handleChange} {...props} />
    </label>
  );
}

function mergeFiles(currentFiles: File[], incomingFiles: File[]) {
  const seen = new Set(currentFiles.map(fileKey));
  const merged = [...currentFiles];

  for (const file of incomingFiles) {
    const key = fileKey(file);

    if (!seen.has(key)) {
      seen.add(key);
      merged.push(file);
    }
  }

  return merged;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function replaceInputFiles(input: HTMLInputElement, files: File[]) {
  try {
    const dataTransfer = new DataTransfer();

    files.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  } catch {
    // Older browsers may not allow programmatic FileList replacement.
  }
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
