const INTERNATIONAL_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(input: string): string {
  return input.replace(/[\s-()]/g, "");
}

export function isValidInternationalPhone(input: string): boolean {
  const normalized = normalizePhone(input.trim());
  return INTERNATIONAL_PHONE_PATTERN.test(normalized);
}

export function formatPhoneHintExamples(): string {
  return "+852 9123 4567 · +1 212 555 0199 · +886 912 345 678";
}
