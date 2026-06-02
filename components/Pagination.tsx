export function Pagination() {
  return (
    <div className="flex items-center justify-between gap-4 text-14 text-qidra-grayBlue">
      <button className="rounded-qidra border border-qidra-grayLight px-4 py-2">Previous</button>
      <span>1 / 1</span>
      <button className="rounded-qidra border border-qidra-grayLight px-4 py-2">Next</button>
    </div>
  );
}
