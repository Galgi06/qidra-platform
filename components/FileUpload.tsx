import type { InputHTMLAttributes } from "react";

type FileUploadProps = InputHTMLAttributes<HTMLInputElement> & {
  hint?: string;
  label: string;
};

export function FileUpload({ hint = "PDF, JPG, PNG", label, ...props }: FileUploadProps) {
  return (
    <label className="surface grid cursor-pointer gap-2 border-dashed p-5 text-14 text-qidra-grayBlue">
      <span className="font-medium text-qidra-dark">{label}</span>
      <span>{hint}</span>
      <input accept=".pdf,.jpg,.jpeg,.png" type="file" className="sr-only" {...props} />
    </label>
  );
}
