export function NotificationCard({ title, text, tone = "info" }: { title: string; text: string; tone?: "info" | "success" | "error" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "border-qidra-green bg-green-50"
      : tone === "error"
        ? "border-qidra-red bg-red-50"
        : tone === "warning"
          ? "border-qidra-gold bg-yellow-50"
          : "border-qidra-accent bg-qidra-accent8";

  return (
    <div className={`rounded-qidra border p-4 ${toneClass}`}>
      <strong className="text-16">{title}</strong>
      <p className="mt-1 text-14 text-qidra-grayBlue">{text}</p>
    </div>
  );
}
