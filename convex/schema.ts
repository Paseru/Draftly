import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,
    users: defineTable({
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.number()),
        phone: v.optional(v.string()),
        phoneVerificationTime: v.optional(v.number()),
        isAnonymous: v.optional(v.boolean()),
        // Track if user has used their free trial (first generation)
        hasUsedFreeTrial: v.optional(v.boolean()),
        // Track monthly generation usage
        generationsUsed: v.optional(v.number()),
        generationsResetAt: v.optional(v.number()), // Timestamp when counter was last reset
        // Stripe customer ID (for secure subscription lookup)
        stripeCustomerId: v.optional(v.string()),
        // Subscription tracking (source of truth for current plan)
        subscriptionStripeId: v.optional(v.string()),
        subscriptionPriceId: v.optional(v.string()),
        subscriptionStatus: v.optional(v.string()),
        subscriptionCurrentPeriodEnd: v.optional(v.number()),
        subscriptionCancelAtPeriodEnd: v.optional(v.boolean()),
    })
        .index("email", ["email"])
        .index("phone", ["phone"]),

    // Projects table to store user generation history
    projects: defineTable({
        userId: v.id("users"),
        title: v.string(),
        prompt: v.string(),
        screens: v.array(v.object({
            id: v.string(),
            name: v.string(),
            html: v.string(),
        })),
        previewHtml: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_created", ["userId", "createdAt"]),
});
