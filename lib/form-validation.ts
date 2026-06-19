import { z } from "zod";

export type FieldErrors = Record<string, string>;

const suspiciousWords = new Set([
  "aaa",
  "aaaa",
  "abc",
  "abcd",
  "asdf",
  "asdfgh",
  "city",
  "demo",
  "example",
  "fake",
  "none",
  "null",
  "qwerty",
  "test",
  "тест",
  "нет",
  "город"
]);

const letterPattern = /\p{L}/u;
const digitPattern = /\p{N}/u;
const repeatedCharactersPattern = /(.)\1{4,}/u;
const repeatedShortWordsPattern = /\b([\p{L}\p{N}]{2,})\b(?:[\s,.-]+\1\b){2,}/iu;
const freeTextPattern = /^[\p{L}\p{M}\p{N} .,'’"\/&()#+-]+$/u;
const addressTextPattern = /^[\p{L}\p{M}\p{N} .,'’"\/&()#+:-]+$/u;

export function cleanText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function isMeaningfulText(value: string, options: { allowDigits?: boolean; minLetters?: number; minWords?: number } = {}) {
  const text = cleanText(value);
  const letters = countMatches(text, /\p{L}/gu);
  const digits = countMatches(text, /\p{N}/gu);
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const normalized = text.toLowerCase();
  const compact = normalized.replace(/[^\p{L}\p{N}]+/gu, "");

  if (!text) return false;
  if (letters < (options.minLetters ?? 2)) return false;
  if (!options.allowDigits && digits > 0) return false;
  if (options.minWords && words.length < options.minWords) return false;
  if (digits >= letters + 2) return false;
  if (compact.length < 2) return false;
  if (suspiciousWords.has(normalized) || suspiciousWords.has(compact)) return false;
  if (repeatedCharactersPattern.test(compact)) return false;
  if (repeatedShortWordsPattern.test(normalized)) return false;
  if (!letterPattern.test(text) && !digitPattern.test(text)) return false;

  return true;
}

export function isPlausibleCity(value: string) {
  const text = cleanText(value);
  return isSafeFreeText(text, { minLetters: 1, pattern: freeTextPattern });
}

export function isPlausibleOccupation(value: string) {
  const text = cleanText(value);
  return isSafeFreeText(text, { minLetters: 1, pattern: freeTextPattern });
}

export function isPlausibleAddress(value: string) {
  const text = cleanText(value);
  return isSafeFreeText(text, { minLetters: 1, pattern: addressTextPattern });
}

export function isPlausiblePhone(value: string | undefined) {
  if (!value) return true;

  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 18 && !/^(\d)\1+$/.test(digits);
}

export function isDetailedText(value: string, options: { minLetters: number; minWords: number }) {
  const text = cleanText(value);
  const letters = countMatches(text, /\p{L}/gu);
  const words = text.match(/[\p{L}\p{N}]{2,}/gu) ?? [];

  return isMeaningfulText(text, { allowDigits: true, minLetters: options.minLetters, minWords: options.minWords }) && letters >= options.minLetters && words.length >= options.minWords;
}

export function zodFieldErrors(error: z.ZodError, labels: Record<string, string>) {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || fieldErrors[field]) continue;
    fieldErrors[field] = labels[field] ?? issue.message;
  }

  return fieldErrors;
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function isSafeFreeText(value: string, options: { minLetters: number; pattern: RegExp }) {
  const text = cleanText(value);
  const letters = countMatches(text, /\p{L}/gu);
  const compact = text.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();

  if (!text) return false;
  if (letters < options.minLetters) return false;
  if (!options.pattern.test(text)) return false;
  if (/[<>]/.test(text)) return false;
  if (/(?:javascript|vbscript|data)\s*:/iu.test(text)) return false;
  if (/<\/?[a-z][^>]*>/iu.test(text)) return false;
  if (/\bon[a-z]+\s*=/iu.test(text)) return false;
  if (!letterPattern.test(text) && !digitPattern.test(text)) return false;
  if (compact && repeatedCharactersPattern.test(compact)) return false;

  return true;
}
