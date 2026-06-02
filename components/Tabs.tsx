import Link from "next/link";

export function Tabs({ items, activeHref }: { items: { label: string; href: string; active?: boolean }[]; activeHref?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-qidra-grayLight">
      {items.map((item) => {
        const isActive = item.active || item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-14 font-medium ${
              isActive ? "border-qidra-accent text-qidra-accent" : "border-transparent text-qidra-grayBlue"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
