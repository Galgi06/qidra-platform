import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex flex-wrap gap-2 text-14 text-qidra-grayBlue" aria-label="Breadcrumbs">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span className="text-qidra-dark">{item.label}</span>}
          {index < items.length - 1 ? <span>/</span> : null}
        </span>
      ))}
    </nav>
  );
}
