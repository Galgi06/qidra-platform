export function DocumentItem({ title, href, meta, actionLabel = "Открыть" }: { title: string; href: string; meta?: string; actionLabel?: string }) {
  return (
    <a className="surface flex items-center justify-between gap-4 p-4 hover:border-qidra-accent" href={href} rel="noreferrer" target="_blank">
      <span className="grid gap-1">
        <strong className="text-16">{title}</strong>
        {meta ? <span className="text-12 text-qidra-grayBlue">{meta}</span> : null}
      </span>
      <span className="text-14 font-medium text-qidra-accent">{actionLabel}</span>
    </a>
  );
}
