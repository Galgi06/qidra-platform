"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

const templates = {
  ru: [
    "Здравствуйте. Спасибо за обращение. Уточните, пожалуйста, номер заявки или transaction hash, чтобы мы быстрее проверили ситуацию.",
    "Мы приняли обращение в работу и проверяем данные. Вернёмся с ответом в этом диалоге.",
    "Для восстановления доступа подтвердите личность по документам, которые были одобрены при KYC.",
    "Вопрос решён. Если потребуется дополнительная помощь, вы можете открыть новое обращение."
  ],
  en: [
    "Hello. Thank you for contacting us. Please provide the application number or transaction hash so we can check the case faster.",
    "We have taken the request into work and are checking the details. We will reply in this thread.",
    "To restore access, please confirm your identity using the documents approved during KYC.",
    "The issue is resolved. If you need further help, you can open a new request."
  ]
};

export function QuickReplyTemplates({ locale, textareaId }: { locale: Locale; textareaId: string }) {
  const [selected, setSelected] = useState("");
  const items = templates[locale];

  function insertTemplate(value: string) {
    setSelected(value);
    const textarea = document.getElementById(textareaId);

    if (textarea instanceof HTMLTextAreaElement) {
      textarea.value = value;
      textarea.focus();
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-13 font-medium text-qidra-grayBlue">{locale === "ru" ? "Готовые ответы" : "Quick replies"}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            key={item}
            className={`rounded-qidra border px-3 py-2 text-13 font-medium transition-colors ${
              selected === item ? "border-qidra-accent bg-qidra-accent text-white" : "border-qidra-grayLight bg-white text-qidra-grayBlue hover:border-qidra-accent hover:text-qidra-accent"
            }`}
            onClick={() => insertTemplate(item)}
            type="button"
          >
            {locale === "ru" ? `Шаблон ${index + 1}` : `Template ${index + 1}`}
          </button>
        ))}
      </div>
    </div>
  );
}
