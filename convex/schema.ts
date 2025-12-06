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
        // Explicitly store remaining generations for easy dashboard viewing
        remainingGenerations: v.optional(v.number()),
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
        // Store flows for edge restoration
        flows: v.optional(v.array(v.object({
            from: v.string(),
            to: v.string(),
            label: v.optional(v.string()),
        }))),
        previewHtml: v.optional(v.string()),
        // Screenshot of first screen for preview (base64)
        previewImage: v.optional(v.string()),
        // Store sidebar conversation messages
        messages: v.optional(v.array(v.object({
            role: v.string(),
            content: v.optional(v.string()),
            thinkingContent: v.optional(v.string()),
            isThinkingComplete: v.optional(v.boolean()),
            isThinkingPaused: v.optional(v.boolean()),
            thinkingDuration: v.optional(v.number()),
            question: v.optional(v.any()),
            questionIndex: v.optional(v.number()),
            submittedAnswer: v.optional(v.any()),
            isPlanReady: v.optional(v.boolean()),
            plannedScreens: v.optional(v.array(v.any())),
            isArchitectureApproved: v.optional(v.boolean()),
            isDesignSystemReady: v.optional(v.boolean()),
            designSystemOptions: v.optional(v.any()),
            submittedDesignSystem: v.optional(v.any()),
            designSteps: v.optional(v.array(v.object({
                id: v.string(),
                label: v.string(),
                status: v.string(),
            }))),
        }))),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_created", ["userId", "createdAt"]),
});
