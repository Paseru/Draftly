'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { ArrowLeft, Loader2, Check, Crown, Zap, Layers, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { PLAN_DETAILS } from '@/lib/stripePlans';

// Icon mapping for plans
const planIcons = {
    starter: Layers,
    pro: Zap,
    enterprise: Crown,
} as const;

function formatDate(timestamp: number): string {
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000;
    // Stripe displays billing date as the day AFTER current_period_end
    // Add 1 day (86400000 ms) to match their display
    const billingDate = new Date(timestampMs + 86400000);
    return billingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

export default function SubscriptionPage() {
    const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
    const subscription = useQuery(api.stripe.getUserSubscription);
    const generationsData = useQuery(api.users.getGenerationsRemaining);
    const editsData = useQuery(api.users.getEditsRemaining);

    // Fetch prices dynamically from Convex server
    const stripePricesData = useQuery(api.stripeConfig.getStripePrices);

    // Build plans array dynamically once prices are loaded
    const plans = stripePricesData ? Object.entries(PLAN_DETAILS).map(([key, details]) => ({
        ...details,
        icon: planIcons[key as keyof typeof planIcons],
        priceId: stripePricesData.prices[key as keyof typeof stripePricesData.prices],
    })) : [];

    const createCheckout = useAction(api.stripe.createSubscriptionCheckout);
    const createBillingPortal = useAction(api.stripe.createBillingPortalSession);
    const syncSubscription = useAction(api.stripe.syncSubscriptionFromStripe);

    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [isManaging, setIsManaging] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Auto-sync subscription ONLY when returning from Stripe
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasStripeParams = urlParams.has('session_id') || urlParams.has('success');

        if (!hasStripeParams) return;

        const autoSync = async () => {
            if (isAuthenticated && !isSyncing) {
                try {
                    setIsSyncing(true);
                    const result = await syncSubscription();
                    if (result.found) {
                        setSuccessMessage('Subscription updated successfully!');
                    }
                    window.history.replaceState({}, '', '/subscription');
                } catch (err) {
                    console.error('Auto-sync error:', err);
                } finally {
                    setIsSyncing(false);
                }
            }
        };

        autoSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // Open Stripe Billing Portal - handles everything (cancel, change plan, payment method, etc.)
    const handleManageSubscription = async () => {
        setIsManaging(true);
        setError(null);

        try {
            const result = await createBillingPortal({ returnUrl: '/subscription' });
            window.location.href = result.url;
        } catch (err) {
            console.error('Portal error:', err);
            setError(err instanceof Error ? err.message : 'Failed to open subscription management');
            setIsManaging(false);
        }
    };

    // Subscribe to a new plan
    const handleSubscribe = async (planId: string, priceId: string) => {
        setLoadingPlanId(planId);
        setError(null);

        try {
            const result = await createCheckout({ priceId, returnUrl: '/subscription' });
            if (result.url) {
                window.location.href = result.url;
            } else {
                setError('Failed to create checkout session. Please try again.');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
        } finally {
            setLoadingPlanId(null);
        }
    };

    // Loading state
    if (isAuthLoading || subscription === undefined || !stripePricesData) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center font-mono">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center font-mono">
                <div className="text-center">
                    <p className="text-zinc-400 mb-4">Please sign in to manage your subscription</p>
                    <Link href="/" className="text-blue-400 hover:text-blue-300">
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    const currentPlan = subscription ? plans.find(p => p.id === subscription.plan) : null;

    return (
        <div className="min-h-screen w-full bg-[#1e1e1e] font-mono py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back</span>
                    </Link>
                    <div className="h-4 w-px bg-[#3e3e42]" />
                    <h1 className="text-sm font-semibold text-zinc-100">Subscription</h1>
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-400">{successMessage}</p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Current Subscription Card */}
                {subscription ? (
                    <div className="mb-8 p-6 bg-[#252526] border border-[#3e3e42] rounded-xl">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-100 mb-1">Current Plan</h2>
                                <p className="text-xs text-zinc-500">Manage your subscription via Stripe</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${subscription.cancelAtPeriodEnd
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                : 'bg-green-500/10 border border-green-500/20 text-green-400'
                                }`}>
                                {subscription.cancelAtPeriodEnd ? 'Canceling' : 'Active'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {/* Plan */}
                            <div className="space-y-1">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Plan</p>
                                <div className="flex items-center gap-2">
                                    {currentPlan && <currentPlan.icon className="w-4 h-4 text-blue-400" />}
                                    <span className="text-sm font-medium text-zinc-100">
                                        {currentPlan?.name || subscription.plan}
                                    </span>
                                </div>
                            </div>

                            {/* Billing Date */}
                            <div className="space-y-1">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                    {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}
                                </p>
                                <p className="text-sm font-medium text-zinc-100">
                                    {subscription.currentPeriodEnd
                                        ? formatDate(subscription.currentPeriodEnd)
                                        : 'N/A'
                                    }
                                </p>
                            </div>

                            {/* Generations */}
                            <div className="space-y-1">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Generations</p>
                                <p className="text-sm font-medium text-zinc-100">
                                    {generationsData?.remaining === -1 ? (
                                        <span className="text-green-400">● Unlimited</span>
                                    ) : (
                                        <span>
                                            {generationsData?.remaining ?? 0} / {generationsData?.total ?? 0} remaining
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Edits */}
                            <div className="space-y-1">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Edits</p>
                                <p className="text-sm font-medium text-zinc-100">
                                    {editsData?.remaining === -1 ? (
                                        <span className="text-green-400">● Unlimited</span>
                                    ) : (
                                        <span>
                                            {editsData?.remaining ?? 0} / {editsData?.total ?? 0} remaining
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {subscription.cancelAtPeriodEnd && (
                            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <p className="text-xs text-amber-400">
                                    Your subscription is set to cancel. You&apos;ll have access until {formatDate(subscription.currentPeriodEnd)}.
                                </p>
                            </div>
                        )}

                        {/* Single Manage Button */}
                        <button
                            onClick={handleManageSubscription}
                            disabled={isManaging}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isManaging ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Opening Stripe...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4" />
                                    Manage Subscription
                                </>
                            )}
                        </button>

                        <p className="mt-3 text-xs text-zinc-500 text-center">
                            Change plan, update payment method, or cancel anytime
                        </p>
                    </div>
                ) : (
                    /* No subscription - Free tier info */
                    <div className="mb-8 p-6 bg-[#252526] border border-[#3e3e42] rounded-xl">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-100 mb-1">No Active Subscription</h2>
                                <p className="text-xs text-zinc-500">Choose a plan below to unlock more generations</p>
                            </div>
                            <div className="px-3 py-1 bg-zinc-500/10 border border-zinc-500/20 rounded-full text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                                Free
                            </div>
                        </div>
                    </div>
                )}

                {/* Plans Grid - Always show */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-zinc-100 mb-1">Change Plan</h2>
                    <p className="text-xs text-zinc-500 mb-4">Upgrade or downgrade your subscription</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {plans.map((plan) => {
                            const Icon = plan.icon;
                            const isLoading = loadingPlanId === plan.id;
                            const isCurrentPlan = subscription?.plan === plan.id;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-xl border p-4 transition-all duration-200 hover:border-zinc-600 flex flex-col ${isCurrentPlan
                                        ? 'border-blue-500/50 bg-blue-500/5'
                                        : plan.popular
                                            ? 'border-blue-500/30 bg-blue-500/5'
                                            : 'border-[#3e3e42] bg-[#252526]'
                                        }`}
                                >
                                    {isCurrentPlan ? (
                                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-medium rounded-full">
                                                Current Plan
                                            </span>
                                        </div>
                                    ) : plan.popular && (
                                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                            <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-medium rounded-full">
                                                Most Popular
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`p-1.5 rounded-md ${isCurrentPlan || plan.popular ? 'bg-blue-500/20' : 'bg-zinc-800'
                                            }`}>
                                            <Icon className={`w-3.5 h-3.5 ${isCurrentPlan || plan.popular ? 'text-blue-400' : 'text-zinc-400'
                                                }`} />
                                        </div>
                                        <span className="text-xs font-medium text-white">{plan.name}</span>
                                    </div>

                                    <div className="mb-2">
                                        <span className="text-2xl font-bold text-white">${plan.price}</span>
                                        <span className="text-xs text-zinc-500">/{plan.period}</span>
                                    </div>

                                    <div className="text-[10px] text-zinc-500 mb-3">
                                        {plan.generations === -1 ? 'Unlimited' : plan.generations} generations/month
                                    </div>

                                    <ul className="space-y-1.5 mb-4 flex-grow">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isCurrentPlan || plan.popular ? 'text-blue-400' : 'text-zinc-500'
                                                    }`} />
                                                <span className="text-[11px] text-zinc-400">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {isCurrentPlan ? (
                                        <button
                                            disabled
                                            className="w-full py-2 text-xs font-medium rounded-md bg-zinc-700 text-zinc-400 cursor-not-allowed mt-auto"
                                        >
                                            Current Plan
                                        </button>
                                    ) : subscription ? (
                                        <button
                                            onClick={handleManageSubscription}
                                            disabled={isManaging}
                                            className={`w-full py-2 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto ${plan.popular
                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                : 'bg-white text-black hover:bg-zinc-200'
                                                }`}
                                        >
                                            Switch Plan
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSubscribe(plan.id, plan.priceId)}
                                            disabled={isLoading || loadingPlanId !== null}
                                            className={`w-full py-2 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto ${plan.popular
                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                : 'bg-white text-black hover:bg-zinc-200'
                                                }`}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Subscribe'
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-xs text-zinc-500">
                        All payments are securely processed by Stripe
                    </p>
                </div>
            </div>
        </div>
    );
}
