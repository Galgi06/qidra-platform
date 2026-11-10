const financialPatterns = [
  /автореинвест|реинвест|дивиденд|начислен|выплат|доход|прибыл|доходност|инвестиц|вложен|баланс|кошел[её]к|плат[её]ж|оплат|пополн|вывод|сумм|usdt|договор|контракт|дол[яи]|процент/i,
  /reinvest|dividend|payout|return|profit|yield|investment|invested|balance|wallet|payment|deposit|withdraw|amount|usdt|contract|share|percent/i
];

const topicRules = [
  {
    category: "access",
    patterns: [/вход|парол|аккаунт|google|авторизац|почт|email/i, /sign.?in|login|password|account|google|email/i],
    ru: "Для входа откройте страницу «Вход» и используйте email с паролем или кнопку Google. Для восстановления пароля выберите «Забыли пароль?». Никому не сообщайте пароль, код из письма или данные карты. Если появляется ошибка, пришлите её текст или скриншот и укажите email аккаунта.",
    en: "Open the Sign in page and use your email and password or the Google button. To reset a password, select Forgot password. Never share your password, email code, or card details. If you see an error, send its exact text or a screenshot and provide the account email."
  },
  {
    category: "kyc",
    patterns: [/kyc|анкета|документ|паспорт|адрес|професси|город/i, /kyc|profile|document|passport|address|occupation|city/i],
    ru: "Откройте «Профиль участника» → «Профиль и KYC», заполните обязательные поля и приложите документ личности и подтверждение адреса. Поддерживаются PDF, JPG и PNG. Статус проверки появится в этом разделе. Не отправляйте документы и их номера в сообщении чата.",
    en: "Open Participant profile → Profile and KYC, complete the required fields, and attach an identity document and proof of address. PDF, JPG, and PNG are supported. The review status will appear there. Do not paste document images or numbers into chat messages."
  },
  {
    category: "projects",
    patterns: [/проект|заявк|участи|mudaraba|musharaka|карточк/i, /project|application|participat|mudaraba|musharaka|listing/i],
    ru: "Откройте «Проекты», выберите карточку и сначала изучите описание, документы, условия и риски. Если приём заявок открыт и профиль допущен, кнопка участия будет доступна на странице проекта. Если кнопки нет, пришлите название проекта и скриншот страницы.",
    en: "Open Projects, choose a listing, and first review its description, documents, terms, and risks. If applications are open and your profile is eligible, the participation button will be available on the project page. If it is missing, send the project name and a screenshot."
  },
  {
    category: "security",
    patterns: [/безопас|мошенн|код|секрет|карта|данн/i, /security|fraud|code|secret|card|personal data/i],
    ru: "Сотрудники Qidra не запрашивают пароль, код подтверждения, полный номер карты или секретную фразу кошелька. Не публикуйте такие данные в чате. Если вы уже передали их третьим лицам, сразу сообщите об этом здесь и смените пароль.",
    en: "Qidra staff do not ask for passwords, verification codes, full card numbers, or wallet seed phrases. Do not post them in chat. If you already shared them with someone, report it here immediately and change your password."
  },
  {
    category: "platform",
    patterns: [/qidra|кидра|платформ|личн.{0,4} кабинет|раздел|меню|сайт/i, /qidra|platform|dashboard|section|menu|website/i],
    ru: "В Qidra основные разделы находятся в верхнем меню и личном кабинете: проекты и их документы, профиль и KYC, контракты и дивиденды, кошелёк, уведомления и поддержка. Напишите, какой раздел или действие вы ищете, и я подскажу точный путь.",
    en: "Qidra's main areas are available from the top menu and your dashboard: projects and their documents, profile and KYC, contracts and dividends, wallet, notifications, and support. Tell me which section or action you need, and I will provide the exact path."
  }
];

function normalize(value) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function isFinancial(message) {
  return financialPatterns.some((pattern) => pattern.test(message));
}

function faqAnswer(message, locale, faqItems) {
  const normalizedMessage = normalize(message);
  if (!normalizedMessage || !Array.isArray(faqItems)) return null;

  let best = null;
  for (const item of faqItems) {
    const question = item?.question?.[locale];
    const answer = item?.answer?.[locale];
    if (!question || !answer || isFinancial(question)) continue;

    const words = normalize(question)
      .split(" ")
      .filter((word) => word.length >= 4);
    const score = words.filter((word) => normalizedMessage.includes(word)).length;
    if (score >= 2 && (!best || score > best.score)) best = { answer, score };
  }

  return best?.answer || null;
}

export function buildSupportBotReply({ faqItems = [], hasAttachments = false, locale = "ru", message }) {
  const ru = locale !== "en";
  const prefix = ru ? "Qidra Assistant\n\n" : "Qidra Assistant\n\n";

  if (hasAttachments) {
    return {
      body: `${prefix}${ru ? "Я не анализирую документы и изображения автоматически. Уточните, пожалуйста, что именно нужно проверить в приложенном файле. Сообщение передано специалисту поддержки." : "I do not automatically analyze documents or images. Please clarify what should be checked in the attached file. Your message has been passed to a support specialist."}`,
      category: "attachment",
      escalate: true
    };
  }

  if (isFinancial(message)) {
    return {
      body: `${prefix}${ru ? "Этот вопрос связан с финансами, поэтому я не буду давать консультацию, рассчитывать суммы или выполнять операции. Уточните, пожалуйста: название проекта или договора, период, сумму и какое действие вы ожидаете. Специалист проверит данные и ответит в этом диалоге. Не отправляйте пароль, коды подтверждения или данные карты." : "This question concerns finances, so I will not provide advice, calculate amounts, or perform transactions. Please specify the project or contract, period, amount, and the action you expect. A specialist will verify the details and reply in this thread. Do not send passwords, verification codes, or card details."}`,
      category: "financial",
      escalate: true
    };
  }

  const rule = topicRules.find((candidate) => candidate.patterns.some((pattern) => pattern.test(message)));
  if (rule) {
    return {
      body: `${prefix}${ru ? rule.ru : rule.en}`,
      category: rule.category,
      escalate: false
    };
  }

  const answer = faqAnswer(message, ru ? "ru" : "en", faqItems);
  if (answer) {
    return { body: `${prefix}${answer}`, category: "faq", escalate: false };
  }

  return {
    body: `${prefix}${ru ? "Уточните, пожалуйста, к какому разделу относится вопрос: вход, профиль и KYC, проекты, документы или работа сайта. Если вопрос требует проверки данных аккаунта, специалист ответит в этом диалоге." : "Please clarify which area your question concerns: sign-in, profile and KYC, projects, documents, or website operation. If account data must be checked, a specialist will reply in this thread."}`,
    category: "unclassified",
    escalate: true
  };
}

export function supportBotEnabled() {
  return process.env.SUPPORT_BOT_ENABLED?.trim().toLowerCase() !== "false";
}
