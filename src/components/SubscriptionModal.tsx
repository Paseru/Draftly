'use client';

import React, { useState } from 'react';
import { X, Rocket, Zap, Crown, Check, Loader2, Layers } from 'lucide-react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { PLAN_DETAILS } from '@/lib/stripePlans';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    generatedScreensCount?: number;
}

// Icon mapping for plans
const planIcons = {
    starter: Layers,
    pro: Zap,
    enterprise: Crown,
} as const;

export default function SubscriptionModal({ isOpen, onClose, generatedScreensCount = 2 }: SubscriptionModalProps) {
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const createCheckout = useAction(api.stripe.createSubscriptionCheckout);

    // Fetch prices dynamically from Convex server
    const stripePricesData = useQuery(api.stripeConfig.getStripePrices);

    // Build plans array dynamically once prices are loaded
    const plans = stripePricesData ? Object.entries(PLAN_DETAILS).map(([key, details]) => ({
        ...details,
        icon: planIcons[key as keyof typeof planIcons],
        priceId: stripePricesData.prices[key as keyof typeof stripePricesData.prices],
    })) : [];

    const handleSubscribe = async (planId: string, priceId: string) => {
        setLoadingPlanId(planId);
        setError(null);

        try {
            const currentPath = window.location.pathname;
            const result = await createCheckout({ priceId, returnUrl: currentPath });

            if (result.url) {
                // Redirect to Stripe Checkout
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

    if (!isOpen) return null;

    // Show loading state while fetching prices
    if (!stripePricesData) {
        return (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div className="bg-[#1e1e1e] border border-[#27272a] rounded-xl shadow-2xl p-8">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-[#1e1e1e] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-3xl p-6 m-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-blue-500/10 rounded-md">
                                <Rocket className="w-4 h-4 text-blue-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">Oh no, you&apos;ve run out of credits!</h3>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Your free trial is over. Subscribe now to continue creating your design.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-xs text-red-400">{error}</p>
                    </div>
                )}

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {plans.map((plan) => {
                        const Icon = plan.icon;
                        const isLoading = loadingPlanId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-lg border p-4 transition-all duration-200 hover:border-zinc-600 flex flex-col ${plan.popular
                                    ? 'border-blue-500/50 bg-blue-500/5'
                                    : 'border-[#27272a] bg-[#161616]'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                        <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-medium rounded-full">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`p-1.5 rounded-md ${plan.popular ? 'bg-blue-500/20' : 'bg-zinc-800'
                                        }`}>
                                        <Icon className={`w-3.5 h-3.5 ${plan.popular ? 'text-blue-400' : 'text-zinc-400'
                                            }`} />
                                    </div>
                                    <span className="text-xs font-medium text-white">{plan.name}</span>
                                </div>

                                <div className="mb-3">
                                    <span className="text-2xl font-bold text-white">${plan.price}</span>
                                    <span className="text-xs text-zinc-500">/{plan.period}</span>
                                </div>

                                <div className="text-[10px] text-zinc-500 mb-3">
                                    {plan.generations === -1 ? 'Unlimited' : plan.generations} generations/month
                                </div>

                                <ul className="space-y-2 mb-4 flex-grow">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-blue-400' : 'text-zinc-500'
                                                }`} />
                                            <span className="text-[11px] text-zinc-400">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

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
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
