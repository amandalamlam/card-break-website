/** Always hit origin `/api/...` — never a locale-prefixed path like `/zh-Hant/api/...`. */
export function cartApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (typeof window === "undefined") {
    return normalized;
  }

  return new URL(normalized, window.location.origin).toString();
}
