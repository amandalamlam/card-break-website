import sanitizeHtml from "sanitize-html";

export function sanitizePlainText(value: string, maxLength: number): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/\0/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalPlainText(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (value == null) {
    return null;
  }

  const sanitized = sanitizePlainText(value, maxLength);
  return sanitized.length > 0 ? sanitized : null;
}
