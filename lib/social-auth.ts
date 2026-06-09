export function isSocialProviderConfigured(value?: string) {
  return Boolean(value && !value.startsWith("replace-with"));
}

function getTelegramBotId(token?: string) {
  if (!isSocialProviderConfigured(token)) {
    return "";
  }

  const [botId] = token!.split(":");
  return /^\d+$/.test(botId) ? botId : "";
}

export function getSocialAuthConfig() {
  const telegramBotId = getTelegramBotId(process.env.TELEGRAM_BOT_TOKEN);

  return {
    googleEnabled: isSocialProviderConfigured(process.env.GOOGLE_CLIENT_ID) && isSocialProviderConfigured(process.env.GOOGLE_CLIENT_SECRET),
    telegramBotId,
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
    telegramEnabled: isSocialProviderConfigured(process.env.TELEGRAM_BOT_USERNAME) && Boolean(telegramBotId)
  };
}
