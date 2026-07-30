export function normalizePublicSlug(input: string) {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/['"`’]/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidNormalizedPublicSlug(value: string) {
  return value.length >= 3 && value.length <= 120;
}
