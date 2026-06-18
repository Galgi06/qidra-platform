"use client";

import { useId, useState, type ChangeEvent, type InputHTMLAttributes } from "react";

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

type FileSlot = {
  files: File[];
  id: number;
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
  const inputId = useId();
  const [fileSlots, setFileSlots] = useState<FileSlot[]>([{ files: [], id: 0 }]);
  const [singleFileName, setSingleFileName] = useState("");
  const isMultiple = Boolean(props.multiple);
  const activeSlot = fileSlots[fileSlots.length - 1] ?? { files: [], id: 0 };
  const selectedFiles = fileSlots.flatMap((slot) => slot.files);
  const selectedCount = selectedFiles.length;
  const selectedText =
    selectedCount === 1 ? selectedFiles[0]?.name ?? "" : selectedCount > 1 ? `${selectedCount} ${manyFilesLabel}` : singleFileName;
  const activeText = selectedText || existingFileName || "";
  const statusLabel = selectedText ? selectedLabel : existingLabel;
  const addMoreText = addMoreLabel ?? (selectedLabel === "Выбрано" ? "Добавить ещё документы" : "Add more documents");
  const chooseText = chooseLabel ?? (selectedLabel === "Выбрано" ? "Выбрать документы" : "Select documents");

  function handleChange(event: ChangeEvent<HTMLInputElement>, slotId?: number) {
    const files = event.currentTarget.files;

    if (!files?.length) {
      onChange?.(event);
      return;
    }

    const incomingFiles = Array.from(files);

    if (isMultiple) {
      const currentKeys = new Set(selectedFiles.map(fileKey));
      const hasNewFile = incomingFiles.some((file) => !currentKeys.has(fileKey(file)));

      if (!hasNewFile) {
        event.currentTarget.value = "";
        onChange?.(event);
        return;
      }

      setFileSlots((currentSlots) => {
        const existingKeys = new Set(currentSlots.flatMap((slot) => (slot.id === slotId ? [] : slot.files)).map(fileKey));
        const uniqueIncoming = incomingFiles.filter((file) => {
          const key = fileKey(file);

          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });

        const nextSlots = currentSlots.map((slot) => (slot.id === slotId ? { ...slot, files: uniqueIncoming } : slot));
        const hasEmptySlot = nextSlots.some((slot) => slot.files.length === 0);
        return hasEmptySlot ? nextSlots : [...nextSlots, { files: [], id: Math.max(...nextSlots.map((slot) => slot.id)) + 1 }];
      });
    } else {
      setSingleFileName(incomingFiles[0]?.name ?? "");
    }

    onChange?.(event);
  }

  return (
    <div
      className="flex h-full flex-col gap-3 rounded-qidra border border-dashed border-qidra-line bg-qidra-panel p-5 text-14 text-qidra-grayBlue shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] transition-colors hover:border-qidra-accent"
      data-field-wrapper={props.name}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium text-qidra-dark">{label}</span>
        {activeText ? <CheckIcon /> : null}
      </span>
      <span className="min-h-[2.5rem] text-balance">{hint}</span>
      {activeText ? (
        <span className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-qidra bg-white px-3 py-2 text-13 font-medium shadow-[0_0_0_1px_rgba(58,148,97,0.18)]">
          <span className="leading-6">
            <span className="text-qidra-green">{statusLabel}:</span>{" "}
            <span className="break-all text-qidra-dark">{activeText}</span>
          </span>
          {isMultiple && selectedCount > 1 ? (
            <span className="grid max-h-32 gap-1 overflow-y-auto pr-1 text-qidra-dark">
              {selectedFiles.map((file, index) => (
                <span
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="break-all text-12 font-medium leading-5 text-qidra-grayBlue"
                >
                  {index + 1}. {file.name}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      ) : null}
      <label
        className="mt-auto inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-qidra bg-qidra-dark px-3 py-2 text-center text-13 font-semibold text-white shadow-[0_10px_24px_rgba(18,20,23,0.16)] transition-colors hover:bg-qidra-accent"
        htmlFor={isMultiple ? `${inputId}-${activeSlot.id}` : inputId}
      >
        {isMultiple ? (
          <span aria-hidden="true" className="text-18 leading-none">
            +
          </span>
        ) : null}
        {isMultiple ? (activeText ? addMoreText : chooseText) : activeText ? selectedLabel : chooseText}
      </label>
      {isMultiple ? (
        <>
          {fileSlots.map((slot) => (
            <input
              key={slot.id}
              accept={accept}
              className="sr-only"
              id={`${inputId}-${slot.id}`}
              name={props.name}
              onChange={(event) => handleChange(event, slot.id)}
              type="file"
              multiple
              required={false}
            />
          ))}
        </>
      ) : (
        <input accept={accept} type="file" className="sr-only" id={inputId} onChange={(event) => handleChange(event)} {...props} />
      )}
    </div>
  );
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
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
