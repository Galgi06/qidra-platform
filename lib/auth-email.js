export function normalizeAuthEmail(value) {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  const parts = normalized.split("@");

  if (parts.length !== 2 || !parts[0] || !parts[1] || /[\u0000-\u001f\u007f\s]/u.test(normalized)) {
    return "";
  }

  return normalized;
}
