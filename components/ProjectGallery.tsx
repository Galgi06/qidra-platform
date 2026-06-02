export function ProjectGallery({ title }: { title: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="surface min-h-56 bg-qidra-forest p-6 text-white sm:col-span-2">
        <span className="text-14 text-white/70">{title}</span>
      </div>
      <div className="grid gap-3">
        <div className="surface min-h-24 bg-qidra-grayLight" />
        <div className="surface min-h-24 bg-qidra-grayLight" />
      </div>
    </div>
  );
}
