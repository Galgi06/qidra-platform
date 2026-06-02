export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-qidra-accent8" aria-label={`${safeValue}%`}>
      <div className="h-full rounded-full bg-qidra-accent" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
