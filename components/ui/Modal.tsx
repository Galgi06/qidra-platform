import type { ReactNode } from "react";

export function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="surface grid gap-4 p-6 shadow-qidra">
      <h2 className="subtitle-28">{title}</h2>
      {children}
    </div>
  );
}
