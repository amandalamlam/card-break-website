const MAX_SHIPPING_DETAILS_LENGTH = 4000;

export function sanitizeShippingDetails(value: string): string {
  return value
    .replace(/\0/g, "")
    .trim()
    .slice(0, MAX_SHIPPING_DETAILS_LENGTH);
}

export function sanitizeShippingText(value: string, maxLength = 500): string {
  return value.replace(/\0/g, "").trim().slice(0, maxLength);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
