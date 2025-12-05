/**
 * Stripe Configuration - Single Source of Truth
 * 
 * All Stripe price IDs and plan details should be imported from this file.
 * This prevents duplication and ensures consistency across the codebase.
 */

// Price IDs for each plan (from Stripe Dashboard)
export const STRIPE_PRICES = {
    starter: "price_1SakG1EDqhY37sfcrsiqxI27",
    pro: "price_1SakG2EDqhY37sfcJdh3AV2v",
    enterprise: "price_1SakG3EDqhY37sfcP66RNx4a",
} as const;

// Valid price IDs for validation (used server-side)
export const VALID_PRICE_IDS = Object.values(STRIPE_PRICES);

// Plan details for UI display
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

// Plan generation limits (used for quota checking)
export const PLAN_LIMITS = {
    starter: 10,
    pro: 50,
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
