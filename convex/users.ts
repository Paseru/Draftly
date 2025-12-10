import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { components } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { STRIPE_PRICES, PLAN_LIMITS } from "./stripeConfig";

// Check if the current user has already used their free trial
export const hasUsedFreeTrial = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return false;
        }

        const user = await ctx.db.get(userId);
        return user?.hasUsedFreeTrial ?? false;
    },
});

// Get current user info (name, email, etc.)
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        const user = await ctx.db.get(userId);
        return user;
    },
});

// Mark the current user's free trial as used
export const markFreeTrialUsed = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        await ctx.db.patch(userId, {
            hasUsedFreeTrial: true,
        });

        return { success: true };
    },
});

// Reset free trial status (internal only - for admin purposes)
export const resetFreeTrial = internalMutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            hasUsedFreeTrial: false,
        });

        return { success: true };
    },
});

// Get the number of generations remaining for the current user
export const getGenerationsRemaining = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            return null;
        }

        // Check if user has an active subscription in their record
        if (!user.subscriptionPriceId || user.subscriptionStatus !== "active") {
            // No subscription - use remainingGenerations directly from DB
            // Fallback to hasUsedFreeTrial logic only if remainingGenerations is not set
            const remaining = user.remainingGenerations !== undefined
                ? user.remainingGenerations
                : (user.hasUsedFreeTrial ? 0 : 1);

            return {
                remaining,
                total: 1,
                plan: "free"
            };
        }

        // Determine plan based on priceId from users table (using centralized config)
        let plan: "starter" | "pro" | "enterprise" = "starter";

        if (user.subscriptionPriceId === STRIPE_PRICES.pro) {
            plan = "pro";
        } else if (user.subscriptionPriceId === STRIPE_PRICES.enterprise) {
            plan = "enterprise";
        }

        const limit = PLAN_LIMITS[plan];

        // For unlimited plans
        if (limit === -1) {
            return { remaining: -1, total: -1, plan };
        }

        // Check if we need to reset the counter (new month)
        const now = Date.now();
        const resetAt = user.generationsResetAt || 0;
        const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds

        // If the reset date is more than a month ago, the counter should be 0
        const generationsUsed = resetAt < oneMonthAgo ? 0 : (user.generationsUsed || 0);

        return {
            remaining: Math.max(0, limit - generationsUsed),
            total: limit,
            plan,
            used: generationsUsed
        };
    },
});

// Increment the generations used counter
export const incrementGenerationsUsed = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const now = Date.now();
        const resetAt = user.generationsResetAt || 0;
        const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

        let newGenerationsUsed = (user.generationsUsed || 0) + 1;

        // Reset if older than a month
        if (resetAt < oneMonthAgo) {
            newGenerationsUsed = 1;
        }

        const isSubscribed = user.subscriptionPriceId && user.subscriptionStatus === "active";

        // Free users get a single full generation. Mark the trial as used as soon as a generation completes.
        if (!isSubscribed) {
            const updates: any = {
                generationsUsed: newGenerationsUsed,
                hasUsedFreeTrial: true,
                remainingGenerations: 0,
            };

            if (resetAt < oneMonthAgo) {
                updates.generationsResetAt = now;
            }

            await ctx.db.patch(userId, updates);
            return { success: true };
        }

        // Subscription logic
        let plan: "starter" | "pro" | "enterprise" = "starter";
        if (user.subscriptionPriceId === STRIPE_PRICES.pro) plan = "pro";
        else if (user.subscriptionPriceId === STRIPE_PRICES.enterprise) plan = "enterprise";

        const limit = PLAN_LIMITS[plan];
        const remaining = limit === -1 ? 9999 : Math.max(0, limit - newGenerationsUsed);

        const updates: any = {
            generationsUsed: newGenerationsUsed,
            remainingGenerations: remaining
        };

        if (resetAt < oneMonthAgo) {
            updates.generationsResetAt = now;
        }

        await ctx.db.patch(userId, updates);

        return { success: true };
    },
});

// Reset monthly generations (internal only - for admin purposes)
export const resetMonthlyGenerations = internalMutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            generationsUsed: 0,
            generationsResetAt: Date.now(),
        });

        return { success: true };
    },
});

// Internal mutation to update user subscription data
// Called by syncSubscriptionFromStripe to store subscription info in users table
export const updateUserSubscription = internalMutation({
    args: {
        userId: v.id("users"),
        subscriptionStripeId: v.string(),
        subscriptionPriceId: v.string(),
        subscriptionStatus: v.string(),
        subscriptionCurrentPeriodEnd: v.number(),
        subscriptionCancelAtPeriodEnd: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            subscriptionStripeId: args.subscriptionStripeId,
            subscriptionPriceId: args.subscriptionPriceId,
            subscriptionStatus: args.subscriptionStatus,
            subscriptionCurrentPeriodEnd: args.subscriptionCurrentPeriodEnd,
            subscriptionCancelAtPeriodEnd: args.subscriptionCancelAtPeriodEnd,
        });
        return { success: true };
    },
});

// Clear subscription data from user record (for fixing data issues)
export const clearUserSubscription = internalMutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            subscriptionStripeId: undefined,
            subscriptionPriceId: undefined,
            subscriptionStatus: undefined,
            subscriptionCurrentPeriodEnd: undefined,
            subscriptionCancelAtPeriodEnd: undefined,
        });
        return { success: true };
    },
});

// Update stripeCustomerId for secure subscription lookups
// This prevents the need to look up customers by email which is insecure
export const updateStripeCustomerId = internalMutation({
    args: {
        userId: v.id("users"),
        stripeCustomerId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            stripeCustomerId: args.stripeCustomerId,
        });
        return { success: true };
    },
});

// ============================================================================
// QUERY INTERNE : Récupérer tous les emails des utilisateurs
// Utilisée par l'action sendToAllUsers dans emails.ts
// ============================================================================

export const getAllEmails = internalQuery({
    args: {},
    handler: async (ctx): Promise<string[]> => {
        const users = await ctx.db.query("users").collect();

        // Filtre uniquement les utilisateurs avec un email valide
        const emails = users
            .filter((user) => user.email && user.email.length > 0)
            .map((user) => user.email as string);

        return emails;
    },
});
