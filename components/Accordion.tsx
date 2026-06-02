export function Accordion({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <details key={item.question} className="surface p-5">
          <summary className="cursor-pointer text-18 font-medium">{item.question}</summary>
          <p className="mt-3 text-16 text-qidra-grayBlue">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
