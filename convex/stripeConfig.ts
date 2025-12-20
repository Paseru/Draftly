/**
 * Stripe Configuration - SERVER-SIDE ONLY
 * 
 * ⚠️ WARNING: This file contains Convex server functions.
 * DO NOT import this file from client-side code (React components).
 * 
 * For client-side plan details, use: src/lib/stripePlans.ts
 */

import { query } from "./_generated/server";
import { PLAN_DETAILS } from "../src/lib/stripePlans";

// Price IDs from Convex environment variables (different for dev vs prod)
export const STRIPE_PRICES = {
    starter: process.env.STRIPE_PRICE_STARTER!,
    pro: process.env.STRIPE_PRICE_PRO!,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
} as const;

// Valid price IDs for validation (used server-side)
export const VALID_PRICE_IDS = Object.values(STRIPE_PRICES);

// Plan generation limits (used for quota checking)
export const PLAN_LIMITS = {
    starter: 10,
    pro: 50,
    enterprise: -1, // Unlimited
} as const;

// Plan edit limits (used for quota checking)
export const EDIT_LIMITS = {
    free: 5,       // Free users get 5 edits
    starter: 300,
    pro: 1500,
    enterprise: -1, // Unlimited
} as const;

// Screen limits per generation (used for plan design)
export const SCREEN_LIMITS = {
    free: 3,        // Free users: max 3 screens per generation
    starter: 10,
    pro: 25,
    enterprise: -1, // Unlimited
} as const;

// Helper to get plan ID from price ID
export function getPlanFromPriceId(priceId: string): 'starter' | 'pro' | 'enterprise' | 'unknown' {
    if (priceId === STRIPE_PRICES.starter) return 'starter';
    if (priceId === STRIPE_PRICES.pro) return 'pro';
    if (priceId === STRIPE_PRICES.enterprise) return 'enterprise';
    return 'unknown';
}

// Type exports
export type PlanId = keyof typeof STRIPE_PRICES;
export type PriceId = typeof STRIPE_PRICES[PlanId];

// ============================================
// Convex Query to expose prices to client
// ============================================
export const getStripePrices = query({
    args: {},
    handler: async () => {
        return {
            prices: STRIPE_PRICES,
            planDetails: PLAN_DETAILS,
        };
    },
});
