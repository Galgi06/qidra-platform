export function DocumentItem({ title, href, meta }: { title: string; href: string; meta?: string }) {
  return (
    <a className="surface flex items-center justify-between gap-4 p-4 hover:border-qidra-accent" href={href}>
      <span className="grid gap-1">
        <strong className="text-16">{title}</strong>
        {meta ? <span className="text-12 text-qidra-grayBlue">{meta}</span> : null}
      </span>
      <span className="text-14 font-medium text-qidra-accent">PDF</span>
    </a>
  );
}
