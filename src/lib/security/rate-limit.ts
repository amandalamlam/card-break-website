import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanupAt = Date.now();

function cleanupExpiredEntries(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }

  lastCleanupAt = now;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function buildRateLimitKey(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(":");
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "RATE_LIMIT" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export const RATE_LIMITS = {
  withdrawalSubmitPerIpHour: { limit: 6, windowMs: 60 * 60 * 1000 },
  withdrawalCancelPerUserHour: { limit: 10, windowMs: 60 * 60 * 1000 },
  shippingSubmitPerUserHour: { limit: 10, windowMs: 60 * 60 * 1000 },
  cartAddPerUserMinute: { limit: 30, windowMs: 60 * 1000 },
  checkoutPerUserMinute: { limit: 15, windowMs: 60 * 1000 },
} as const;

export function enforceRateLimit(
  request: Request,
  scope: string,
  userId: string | null,
  config: { limit: number; windowMs: number }
) {
  const ip = getClientIp(request);
  const key = buildRateLimitKey(["rl", scope, userId, ip]);
  const result = checkRateLimit(key, config.limit, config.windowMs);

  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSeconds);
  }

  return null;
}
