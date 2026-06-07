export const passwordPolicyDescription = {
  en: "Use at least 10 characters with uppercase and lowercase letters, a number, and a special symbol.",
  ru: "Используйте минимум 10 символов: строчные и заглавные буквы, цифру и специальный символ."
};

export function isStrongPassword(password: string) {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}
