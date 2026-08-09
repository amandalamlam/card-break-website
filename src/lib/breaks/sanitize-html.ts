import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTR = ["href", "target", "rel", "colspan", "rowspan"];

export function sanitizeBreakDescription(html: string): string {
  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

  return cleaned.trim();
}

export function stripHtmlToPlainText(html: string): string {
  const plain = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return plain.replace(/\s+/g, " ").trim();
}

export function isEmptyRichText(html: string): boolean {
  return stripHtmlToPlainText(html).length === 0;
}
