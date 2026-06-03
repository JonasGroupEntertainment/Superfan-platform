import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authRateLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);
  const rateLimitResult = authRateLimiter.check(clientIp);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many sign-out attempts. Please try again later.",
        retryAfter: Math.ceil(
          (rateLimitResult.resetTime.getTime() - Date.now()) / 1000,
        ),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(
            (rateLimitResult.resetTime.getTime() - Date.now()) / 1000,
          ).toString(),
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.resetTime.toISOString(),
        },
      },
    );
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
