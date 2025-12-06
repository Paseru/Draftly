import { query } from "./_generated/server";
import { STRIPE_PRICES, PLAN_LIMITS, getPlanFromPriceId } from "./stripeConfig";

export const getUsersStats = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();

        return users.map((user) => {
            // 1. Determine Plan
            let plan: "starter" | "pro" | "enterprise" | "free" = "free";
            if (user.subscriptionStatus === "active") {
                const p = getPlanFromPriceId(user.subscriptionPriceId || "");
                if (p !== "unknown") plan = p;
            }

            // 2. Get Limit
            const limit = plan === "free" ? 1 : PLAN_LIMITS[plan];

            // 3. Calculate Used with Monthly Reset Logic
            const now = Date.now();
            const resetAt = user.generationsResetAt || 0;
            const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

            // If reset is older than a month, used count is technically 0 for the new period
            // (even if DB record isn't updated yet)
            const effectiveUsed = (resetAt < oneMonthAgo) ? 0 : (user.generationsUsed || 0);

            // 4. Calculate Remaining
            let remaining = 0;
            if (limit === -1) {
                remaining = 9999; // Infinite representation
            } else {
                remaining = Math.max(0, limit - effectiveUsed);
                // Special case for Free tier: if they already used it, 0 remaining
                if (plan === "free" && user.hasUsedFreeTrial) {
                    remaining = 0;
                }
            }

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                plan: plan,
                used: effectiveUsed,
                limit: limit === -1 ? "∞" : limit,
                remaining: limit === -1 ? "∞" : remaining,
                lastReset: user.generationsResetAt ? new Date(user.generationsResetAt).toISOString().split('T')[0] : 'Never'
            };
        });
    },
});
