import assert from "node:assert/strict";
import test from "node:test";
import { buildSupportBotReply } from "../lib/support-bot.js";

test("financial questions are clarified and escalated without advice", () => {
  const reply = buildSupportBotReply({
    locale: "ru",
    message: "Почему мне не пришли дивиденды и какую сумму лучше реинвестировать?"
  });

  assert.equal(reply.category, "financial");
  assert.equal(reply.escalate, true);
  assert.match(reply.body, /не буду давать консультацию/);
  assert.match(reply.body, /название проекта или договора, период, сумму/);
  assert.doesNotMatch(reply.body, /лучше реинвестировать \d/);
});

test("access questions receive safe navigation guidance", () => {
  const reply = buildSupportBotReply({ locale: "ru", message: "Не могу войти через Google на сайт Qidra" });

  assert.equal(reply.category, "access");
  assert.equal(reply.escalate, false);
  assert.match(reply.body, /Никому не сообщайте пароль/);
});

test("attachments always go to a human", () => {
  const reply = buildSupportBotReply({ hasAttachments: true, locale: "en", message: "Please check this" });

  assert.equal(reply.category, "attachment");
  assert.equal(reply.escalate, true);
  assert.match(reply.body, /do not automatically analyze documents/);
});

test("non-financial FAQ content can be used", () => {
  const reply = buildSupportBotReply({
    faqItems: [
      {
        question: { ru: "Когда включится двухфакторная защита?", en: "When is two factor protection enabled?" },
        answer: { ru: "Защита включается в настройках безопасности.", en: "Enable it in security settings." }
      }
    ],
    locale: "ru",
    message: "Когда включится двухфакторная защита?"
  });

  assert.equal(reply.category, "faq");
  assert.equal(reply.escalate, false);
  assert.match(reply.body, /настройках безопасности/);
});
