/**
 * Stripe Plan Details - Client-safe configuration
 * 
 * This file contains plan details that can be safely imported in the browser.
 * For server-side price IDs and Convex functions, see convex/stripeConfig.ts
 */

// Plan details for UI display (client-safe)
export const PLAN_DETAILS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 19,
        period: 'month',
        generations: 10,
        features: [
            '10 app generations per month',
            'Full app generation with all screens',
            'Export your designs anytime',
        ],
        popular: false,
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 49,
        period: 'month',
        generations: 50,
        features: [
            '50 app generations per month',
            'Full app generation with all screens',
            'Export your designs anytime',
        ],
        popular: true,
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 149,
        period: 'month',
        generations: -1, // Unlimited
        features: [
            'Unlimited generations',
            'Full app generation with all screens',
            'Export your designs anytime',
        ],
        popular: false,
    },
} as const;

// Type exports
export type PlanId = keyof typeof PLAN_DETAILS;
