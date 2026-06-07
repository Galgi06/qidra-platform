"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

const templates = {
  ru: [
    {
      body: "Здравствуйте. Спасибо за обращение. Уточните, пожалуйста, номер заявки или transaction hash, чтобы мы быстрее проверили ситуацию.",
      title: "Платёж или заявка"
    },
    {
      body: "Мы приняли обращение в работу и проверяем данные. Вернёмся с ответом в этом диалоге.",
      title: "Принято в работу"
    },
    {
      body: "Для восстановления доступа подтвердите личность по документам, которые были одобрены при KYC.",
      title: "Восстановление доступа"
    },
    {
      body: "Вопрос решён. Если потребуется дополнительная помощь, вы можете открыть новое обращение.",
      title: "Закрытие обращения"
    }
  ],
  en: [
    {
      body: "Hello. Thank you for contacting us. Please provide the application number or transaction hash so we can check the case faster.",
      title: "Payment or application"
    },
    {
      body: "We have taken the request into work and are checking the details. We will reply in this thread.",
      title: "In progress"
    },
    {
      body: "To restore access, please confirm your identity using the documents approved during KYC.",
      title: "Access recovery"
    },
    {
      body: "The issue is resolved. If you need further help, you can open a new request.",
      title: "Closing the request"
    }
  ]
};

export function QuickReplyTemplates({ locale, textareaId }: { locale: Locale; textareaId: string }) {
  const [selected, setSelected] = useState("");
  const items = templates[locale];

  function insertTemplate(template: { body: string; title: string }) {
    setSelected(template.body);
    const textarea = document.getElementById(textareaId);

    if (textarea instanceof HTMLTextAreaElement) {
      textarea.value = template.body;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }
  }

  return (
    <div className="grid gap-2">
      <div>
        <p className="text-13 font-medium uppercase text-qidra-grayBlue">{locale === "ru" ? "Готовые ответы по теме" : "Topic-based quick replies"}</p>
        <p className="mt-1 text-14 text-qidra-grayBlue">
          {locale === "ru" ? "Выберите тему, чтобы быстро вставить текст, или напишите ответ вручную ниже." : "Choose a topic to insert a reply, or write a custom answer below."}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.title}
            className={`min-h-14 rounded-qidra border px-4 py-3 text-left text-14 font-medium transition-colors ${
              selected === item.body ? "border-qidra-accent bg-qidra-accent text-white" : "border-qidra-grayLight bg-white text-qidra-dark hover:border-qidra-accent hover:text-qidra-accent"
            }`}
            onClick={() => insertTemplate(item)}
            type="button"
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
