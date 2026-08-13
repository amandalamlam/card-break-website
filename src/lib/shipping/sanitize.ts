import { sanitizePlainText } from "@/lib/security/sanitize-plain-text";

const MAX_SHIPPING_DETAILS_LENGTH = 4000;

export function sanitizeShippingDetails(value: string): string {
  return sanitizePlainText(value, MAX_SHIPPING_DETAILS_LENGTH);
}

export function sanitizeShippingText(value: string, maxLength = 500): string {
  return sanitizePlainText(value, maxLength);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
