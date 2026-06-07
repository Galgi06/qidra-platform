import { NextResponse, type NextRequest } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  request: NextRequest;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitState>();

export function checkRateLimit({ key, limit, request, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const bucketKey = `${clientIp(request)}:${key}`;
  const current = buckets.get(bucketKey);

  pruneExpiredBuckets(now);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000)
    };
  }

  current.count += 1;
  buckets.set(bucketKey, current);

  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: 0
  };
}

export function rateLimitResponse(localeRu: boolean, retryAfterSeconds: number) {
  return NextResponse.json(
    {
      title: localeRu ? "Слишком много попыток" : "Too many attempts",
      message: localeRu
        ? "Подождите немного и повторите действие позже."
        : "Wait a moment and try again later."
    },
    {
      headers: {
        "Retry-After": String(Math.max(retryAfterSeconds, 1))
      },
      status: 429
    }
  );
}

function clientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();

  return cfIp || forwardedFor || realIp || "unknown";
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 1000) return;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
