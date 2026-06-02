type WalletOperationItemProps = {
  title: string;
  amount: string;
  meta?: string;
  status?: string;
  tone?: "pending" | "success" | "error";
};

const toneClass: Record<NonNullable<WalletOperationItemProps["tone"]>, string> = {
  pending: "text-qidra-accent",
  success: "text-qidra-green",
  error: "text-qidra-red"
};

export function WalletOperationItem({ title, amount, meta, status, tone = "pending" }: WalletOperationItemProps) {
  return (
    <div className="surface bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <span>
          <strong className="block text-16 font-medium text-qidra-dark">{title}</strong>
          <span className="text-12 text-qidra-grayBlue">{meta ?? status}</span>
        </span>
        <strong className={`text-16 font-medium ${toneClass[tone]}`}>{amount}</strong>
      </div>
    </div>
  );
}
