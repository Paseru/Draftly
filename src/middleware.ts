import { convexAuthNextjsMiddleware, createRouteMatcher } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isApiRoute = createRouteMatcher(["/api/generate", "/api/design-system", "/api/extract-name"]);

// Rate limiter in memory (10 requests/minute per IP)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000; // 1 minute

export default convexAuthNextjsMiddleware(async (request) => {
    if (isApiRoute(request)) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
        const now = Date.now();

        const entry = rateLimit.get(ip);
        if (entry && now < entry.resetTime) {
            if (entry.count >= RATE_LIMIT) {
                return NextResponse.json(
                    { error: "Rate limit exceeded. Try again later." },
                    { status: 429 }
                );
            }
            entry.count++;
        } else {
            rateLimit.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        }

        // Cleanup old entries periodically (every 100 requests)
        if (rateLimit.size > 100) {
            for (const [key, value] of rateLimit.entries()) {
                if (now > value.resetTime) {
                    rateLimit.delete(key);
                }
            }
        }
    }
});

export const config = {
    // The middleware handles all paths for token refresh
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
