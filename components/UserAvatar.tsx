export function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <span className="inline-flex size-10 items-center justify-center rounded-full bg-qidra-dark text-14 font-medium text-white">{initials}</span>;
}
