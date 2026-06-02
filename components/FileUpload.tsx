export function FileUpload({ label }: { label: string }) {
  return (
    <label className="surface grid cursor-pointer gap-2 border-dashed p-5 text-14 text-qidra-grayBlue">
      <span className="font-medium text-qidra-dark">{label}</span>
      <span>PDF, JPG, PNG</span>
      <input type="file" className="sr-only" />
    </label>
  );
}
