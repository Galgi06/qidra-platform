"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";

type FileUploadProps = InputHTMLAttributes<HTMLInputElement> & {
  addMoreLabel?: string;
  chooseLabel?: string;
  existingFileName?: string | null;
  existingLabel?: string;
  hint?: string;
  label: string;
  manyFilesLabel?: string;
  removeLabel?: string;
  replaceLabel?: string;
  requiredMessage?: string;
  selectedLabel?: string;
  suppressNativeRequired?: boolean;
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
  name,
  onChange,
  removeLabel,
  replaceLabel,
  required = false,
  requiredMessage,
  selectedLabel = "Selected",
  suppressNativeRequired = false,
  ...props
}: FileUploadProps) {
  const inputId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isMultiple = Boolean(props.multiple);
  const [inputVersion, setInputVersion] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [keepExistingFiles, setKeepExistingFiles] = useState(Boolean(existingFileName));
  const selectedCount = selectedFiles.length;
  const hasSelectedFiles = selectedCount > 0;
  const hasExistingFiles = keepExistingFiles && Boolean(existingFileName);
  const hasAnyFiles = hasSelectedFiles || hasExistingFiles;
  const selectedText =
    selectedCount === 1 ? selectedFiles[0]?.name ?? "" : selectedCount > 1 ? `${selectedCount} ${manyFilesLabel}` : "";
  const activeText = selectedText || (hasExistingFiles ? existingFileName ?? "" : "");
  const statusLabel = hasSelectedFiles ? selectedLabel : existingLabel;
  const addMoreText = addMoreLabel ?? (selectedLabel === "Выбрано" ? "Добавить ещё документы" : "Add more documents");
  const chooseText = chooseLabel ?? (selectedLabel === "Выбрано" ? "Выбрать документы" : "Select documents");
  const replaceText = replaceLabel ?? (selectedLabel === "Выбрано" ? "Заменить" : "Replace");
  const removeText = removeLabel ?? (selectedLabel === "Выбрано" ? "Удалить" : "Remove");
  const pickerText = isMultiple ? (hasAnyFiles ? addMoreText : chooseText) : hasAnyFiles ? replaceText : chooseText;
  const useCustomRequiredValidation = required || suppressNativeRequired;
  const fallbackRequiredMessage = requiredMessage ?? (selectedLabel === "Выбрано" ? `Добавьте файл в поле «${label}».` : `Add a file for “${label}”.`);

  useEffect(() => {
    if (!name) return;

    const form = wrapperRef.current?.closest("form");

    if (!form) return;

    const handleFormData = (event: Event) => {
      const formDataEvent = event as Event & { formData?: FormData };

      if (!formDataEvent.formData) return;

      formDataEvent.formData.delete(name);

      for (const file of selectedFiles) {
        formDataEvent.formData.append(name, file);
      }

      if (existingFileName) {
        formDataEvent.formData.set(`${name}__keepExisting`, keepExistingFiles && !selectedFiles.length ? "1" : "0");
      }
    };

    form.addEventListener("formdata", handleFormData);
    return () => form.removeEventListener("formdata", handleFormData);
  }, [existingFileName, keepExistingFiles, name, selectedFiles]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;

    if (!files?.length) {
      onChange?.(event);
      return;
    }

    const incomingFiles = Array.from(files);

    setSelectedFiles((currentFiles) => {
      if (!isMultiple) {
        return incomingFiles.slice(0, 1);
      }

      const keys = new Set(currentFiles.map(fileKey));
      const uniqueIncoming = incomingFiles.filter((file) => {
        const key = fileKey(file);

        if (keys.has(key)) return false;
        keys.add(key);
        return true;
      });

      return uniqueIncoming.length ? [...currentFiles, ...uniqueIncoming] : currentFiles;
    });
    setKeepExistingFiles(false);
    setInputVersion((current) => current + 1);
    event.currentTarget.value = "";
    onChange?.(event);
  }

  function removeSelectedFile(targetFile: File) {
    setSelectedFiles((currentFiles) => currentFiles.filter((file) => fileKey(file) !== fileKey(targetFile)));
  }

  function clearCurrentFiles() {
    setSelectedFiles([]);
    setKeepExistingFiles(false);
    setInputVersion((current) => current + 1);
  }

  return (
    <div
      ref={wrapperRef}
      className="flex h-full flex-col gap-3 rounded-qidra border border-dashed border-qidra-line bg-qidra-panel p-5 text-14 text-qidra-grayBlue shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] transition-colors hover:border-qidra-accent"
      data-field-wrapper={name}
      data-has-file={hasAnyFiles ? "true" : "false"}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium text-qidra-dark">{label}</span>
        {hasAnyFiles ? <CheckIcon /> : null}
      </span>
      <span className="min-h-[2.5rem] text-balance">{hint}</span>
      {hasAnyFiles ? (
        <span className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-qidra bg-white px-3 py-2 text-13 font-medium shadow-[0_0_0_1px_rgba(58,148,97,0.18)]">
          <span className="leading-6">
            <span className="text-qidra-green">{statusLabel}:</span>{" "}
            <span className="break-all text-qidra-dark">{activeText}</span>
          </span>
          {hasSelectedFiles ? (
            <span className="grid gap-2">
              {selectedFiles.map((file, index) => (
                <span
                  key={`${fileKey(file)}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-qidra bg-qidra-grayLight px-3 py-2"
                >
                  <span className="min-w-0 break-all text-12 font-medium leading-5 text-qidra-dark">
                    {isMultiple ? `${index + 1}. ` : ""}
                    {file.name}
                  </span>
                  <button
                    className="shrink-0 text-12 font-semibold text-qidra-red transition-colors hover:text-qidra-dark"
                    onClick={() => removeSelectedFile(file)}
                    type="button"
                  >
                    {removeText}
                  </button>
                </span>
              ))}
            </span>
          ) : hasExistingFiles ? (
            <span className="flex items-center justify-between gap-3 rounded-qidra bg-qidra-grayLight px-3 py-2">
              <span className="min-w-0 break-all text-12 font-medium leading-5 text-qidra-dark">{existingFileName}</span>
              <button
                className="shrink-0 text-12 font-semibold text-qidra-red transition-colors hover:text-qidra-dark"
                onClick={clearCurrentFiles}
                type="button"
              >
                {removeText}
              </button>
            </span>
          ) : null}
        </span>
      ) : null}
      <label
        className="mt-auto inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-qidra bg-qidra-dark px-3 py-2 text-center text-13 font-semibold text-white shadow-[0_10px_24px_rgba(18,20,23,0.16)] transition-colors hover:bg-qidra-accent"
        htmlFor={`${inputId}-${inputVersion}`}
      >
        {isMultiple ? (
          <span aria-hidden="true" className="text-18 leading-none">
            +
          </span>
        ) : null}
        {pickerText}
      </label>
      <input
        accept={accept}
        className="sr-only"
        data-required-file={useCustomRequiredValidation ? "true" : undefined}
        data-required-message={fallbackRequiredMessage}
        id={`${inputId}-${inputVersion}`}
        multiple={isMultiple}
        onChange={handleChange}
        type="file"
      />
      {existingFileName ? <input name={`${name}__keepExisting`} type="hidden" value={keepExistingFiles && !selectedFiles.length ? "1" : "0"} /> : null}
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
