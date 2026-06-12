export function isImportedPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith("@qidra.import");
}

export function isServiceGeneratedEmail(email: string) {
  const normalized = email.toLowerCase();
  return normalized.endsWith("@qidra.import") || normalized.endsWith("@qidra.local") || normalized.endsWith("@telegram.qidra.local");
}

export function participantEmailHint(email: string, locale: "ru" | "en") {
  if (isImportedPlaceholderEmail(email)) {
    return locale === "ru" ? "Служебный email импорта, замените в досье клиента." : "Imported placeholder email, replace it in the client dossier.";
  }

  if (isServiceGeneratedEmail(email)) {
    return locale === "ru" ? "Системный email, проверьте карточку участника." : "System-generated email, review the participant card.";
  }

  return locale === "ru" ? "Собственный email участника" : "Participant's own email";
}
