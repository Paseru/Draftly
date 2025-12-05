import { action, query } from "./_generated/server";
import { components, api, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type Stripe from "stripe";
import { STRIPE_PRICES, VALID_PRICE_IDS, getPlanFromPriceId } from "./stripeConfig";

// Re-export for backward compatibility
export { STRIPE_PRICES };

// Initialize Stripe client
const stripeClient = new StripeSubscriptions(components.stripe, {});

// Type for user from getCurrentUser
type UserType = { email?: string } | null;

// Create a checkout session for a subscription
export const createSubscriptionCheckout = action({
    args: {
        priceId: v.string(),
        returnUrl: v.optional(v.string()),
    },
    returns: v.object({
        sessionId: v.string(),
        url: v.union(v.string(), v.null()),
    }),
    handler: async (ctx, args): Promise<{ sessionId: string; url: string | null }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // SECURITY: Validate priceId against whitelist
        if (!VALID_PRICE_IDS.includes(args.priceId as typeof VALID_PRICE_IDS[number])) {
            throw new Error("Invalid price ID");
        }

        // Get current user from the users table via public API
        const user: UserType = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user || !user.email) {
            throw new Error("User email not found in database");
        }
        const userEmail: string = user.email;

        // Import Stripe directly for custom checkout session
        const StripeLib = (await import("stripe")).default;
        const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY!);

        // Determine success/cancel URLs based on environment
        // Use FRONTEND_URL (not CONVEX_SITE_URL which points to Convex backend)
        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        // Create checkout session with customer_email pre-filled
        const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [
                {
                    price: args.priceId,
                    quantity: 1,
                },
            ],
            customer_email: userEmail,
            success_url: `${baseUrl}${args.returnUrl || '/'}?subscription=success`,
            cancel_url: `${baseUrl}${args.returnUrl || '/'}?subscription=canceled`,
            subscription_data: {
                metadata: {
                    userId: userId,
                },
            },
        });

        return {
            sessionId: session.id,
            url: session.url,
        };
    },
});

// NOTE: createCustomerPortal was removed - it used identity.subject incorrectly
// Use createBillingPortalSession instead which properly retrieves the Stripe customer ID


// Get user's subscription status
// ONLY uses users table - no fallback to component tables to prevent data leaking between users
export const getUserSubscription = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        // ONLY check the users table - this is the source of truth for each user
        const user = await ctx.db.get(userId);

        // If user doesn't have subscription data in their record, return null
        if (!user?.subscriptionPriceId || user?.subscriptionStatus !== "active") {
            return null;
        }

        // Determine plan from priceId using centralized helper
        const priceId = user.subscriptionPriceId;
        const plan = getPlanFromPriceId(priceId);

        return {
            id: user.subscriptionStripeId || "",
            status: user.subscriptionStatus,
            plan,
            priceId,
            currentPeriodEnd: user.subscriptionCurrentPeriodEnd || 0,
            cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd ?? false,
        };
    },
});

// Quick check for active subscription (for paywall logic)
export const hasActiveSubscription = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return false;
        }

        const subscriptions = await ctx.runQuery(
            components.stripe.public.listSubscriptionsByUserId,
            { userId: userId }
        );

        return subscriptions.some(
            (sub) => sub.status === "active" || sub.status === "trialing"
        );
    },
});

// Cancel subscription
export const cancelSubscription = action({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const subscriptions = await ctx.runQuery(
            components.stripe.public.listSubscriptionsByUserId,
            { userId: userId }
        );

        const activeSubscription = subscriptions.find(
            (sub) => sub.status === "active" || sub.status === "trialing"
        );

        if (!activeSubscription) {
            throw new Error("No active subscription found");
        }

        // Cancel at period end (customer keeps access until billing period ends)
        await stripeClient.cancelSubscription(ctx, {
            stripeSubscriptionId: activeSubscription.stripeSubscriptionId,
            cancelAtPeriodEnd: true,
        });

        return { success: true };
    },
});

// Create a Stripe Billing Portal session for managing subscription
// This redirects to Stripe's hosted portal where users can:
// - Change plans (upgrade/downgrade)
// - Cancel subscription
// - Update payment method
// - View invoices
export const createBillingPortalSession = action({
    args: {
        returnUrl: v.optional(v.string()),
        flowType: v.optional(v.union(
            v.literal("subscription_update"),
            v.literal("subscription_cancel"),
            v.literal("payment_method_update")
        )),
    },
    returns: v.object({
        url: v.string(),
    }),
    handler: async (ctx, args): Promise<{ url: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Get user data from users table (source of truth)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user: any = await ctx.runQuery(api.users.getCurrentUser, {});

        if (!user?.subscriptionStripeId || user?.subscriptionStatus !== "active") {
            throw new Error("No active subscription found");
        }

        const StripeLib = (await import("stripe")).default;
        const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY!);

        // Get customer ID from Stripe using the subscription
        const subscription = await stripe.subscriptions.retrieve(user.subscriptionStripeId);
        const customerId = subscription.customer as string;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const returnUrl = args.returnUrl ? `${baseUrl}${args.returnUrl}` : `${baseUrl}/subscription`;

        // Build portal session options
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionOptions: any = {
            customer: customerId,
            return_url: returnUrl,
        };

        // Add flow_data to go directly to specific page
        if (args.flowType === "subscription_update") {
            sessionOptions.flow_data = {
                type: "subscription_update",
                subscription_update: {
                    subscription: user.subscriptionStripeId,
                },
            };
        } else if (args.flowType === "subscription_cancel") {
            sessionOptions.flow_data = {
                type: "subscription_cancel",
                subscription_cancel: {
                    subscription: user.subscriptionStripeId,
                },
            };
        } else if (args.flowType === "payment_method_update") {
            sessionOptions.flow_data = {
                type: "payment_method_update",
            };
        }

        // Create Billing Portal session
        const portalSession = await stripe.billingPortal.sessions.create(sessionOptions);

        return { url: portalSession.url };
    },
});

// Sync subscription from Stripe to Convex (manual sync when webhook fails)
export const syncSubscriptionFromStripe = action({
    args: {},
    returns: v.object({
        found: v.boolean(),
        subscriptionId: v.optional(v.string()),
        priceId: v.optional(v.string()),
        currentPeriodEnd: v.optional(v.number()),
        message: v.string(),
    }),
    handler: async (ctx): Promise<{ found: boolean; subscriptionId?: string; priceId?: string; currentPeriodEnd?: number; message: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Get current user - need stripeCustomerId for secure lookup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user: any = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) {
            throw new Error("User not found");
        }

        // Import Stripe
        const StripeLib = (await import("stripe")).default;
        const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY!);

        let customer: Stripe.Customer | undefined;

        // SECURITY: Prefer stripeCustomerId over email lookup
        // Email lookup is vulnerable to account takeover if someone knows your email
        if (user.stripeCustomerId) {
            try {
                customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
                if (customer.deleted) {
                    customer = undefined;
                }
            } catch (e) {
                console.log("Failed to retrieve customer by ID, falling back to email");
            }
        }

        // Fallback to email only if stripeCustomerId not set (legacy users)
        if (!customer && user.email) {
            const customerList: Stripe.ApiList<Stripe.Customer> = await stripe.customers.list({ email: user.email, limit: 1 });
            if (customerList.data.length > 0) {
                customer = customerList.data[0];
            }
        }

        if (!customer) {
            return { found: false, message: "No Stripe customer found" };
        }

        // Get active subscriptions for this customer (try multiple statuses)
        let subscription: Stripe.Subscription | undefined;

        // First try active subscriptions
        const activeList: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1,
        });

        if (activeList.data.length > 0) {
            subscription = activeList.data[0];
        } else {
            // If no active, try trialing
            const trialingList: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
                customer: customer.id,
                status: "trialing",
                limit: 1,
            });
            if (trialingList.data.length > 0) {
                subscription = trialingList.data[0];
            }
        }

        if (!subscription) {
            return { found: false, message: "No active subscription found in Stripe" };
        }

        // SECURITY: STRICT CHECK - subscription MUST have metadata.userId matching current user
        // This prevents account takeover via email-based lookup
        const subscriptionUserId = subscription.metadata?.userId;
        if (!subscriptionUserId) {
            console.log("⚠️ Subscription has no userId metadata - rejecting for security");
            return { found: false, message: "Subscription not linked to this account" };
        }
        if (subscriptionUserId !== userId) {
            console.log("⚠️ Subscription userId mismatch - rejecting");
            return { found: false, message: "No subscription found for this account" };
        }

        const priceId = subscription.items.data[0]?.price.id || "";

        // Get current_period_end - Stripe SDK types don't include it but it exists
        const rawSub = subscription as unknown as Record<string, unknown>;
        let currentPeriodEnd: number;

        if (typeof rawSub.current_period_end === 'number') {
            currentPeriodEnd = rawSub.current_period_end;
        } else if (typeof rawSub.current_period_end === 'string') {
            currentPeriodEnd = parseInt(rawSub.current_period_end, 10);
        } else {
            currentPeriodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        }

        // Minimal logging - no sensitive data
        console.log(`Syncing subscription: ${subscription.id}, status: ${subscription.status}, plan: ${getPlanFromPriceId(priceId)}`);

        // First, get any existing subscriptions for this user and cancel them
        // This handles the case when user changes plan and Stripe creates a new subscription ID
        const existingUserSubs = await ctx.runQuery(
            components.stripe.public.listSubscriptionsByUserId,
            { userId: userId }
        );

        console.log(`Found ${existingUserSubs.length} existing subscriptions for user`);

        // Mark all OLD subscriptions as canceled (different subscription IDs)
        for (const oldSub of existingUserSubs) {
            if (oldSub.stripeSubscriptionId !== subscription.id) {
                try {
                    await ctx.runMutation(components.stripe.private.handleSubscriptionDeleted, {
                        stripeSubscriptionId: oldSub.stripeSubscriptionId,
                    });
                } catch (e) {
                    // Silent fail for old sub cleanup
                }
            }
        }

        // Check if THIS specific subscription already exists
        const existingSub = await ctx.runQuery(
            components.stripe.public.getSubscription,
            { stripeSubscriptionId: subscription.id }
        );

        if (existingSub) {
            // If priceId is the same and status is active, just update metadata
            if (existingSub.priceId === priceId && existingSub.status === "active") {
                await ctx.runMutation(components.stripe.public.updateSubscriptionMetadata, {
                    stripeSubscriptionId: subscription.id,
                    metadata: { userId: userId },
                    userId: userId,
                });

                return {
                    found: true,
                    subscriptionId: subscription.id,
                    priceId: priceId,
                    currentPeriodEnd: currentPeriodEnd,
                    message: "Subscription already up to date"
                };
            }

            // priceId or status changed - update what we can
            await ctx.runMutation(components.stripe.private.handleSubscriptionUpdated, {
                stripeSubscriptionId: subscription.id,
                status: "active",
                currentPeriodEnd: currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
                quantity: subscription.items.data[0]?.quantity ?? 1,
                metadata: { userId: userId },
            });

            await ctx.runMutation(components.stripe.public.updateSubscriptionMetadata, {
                stripeSubscriptionId: subscription.id,
                metadata: { userId: userId },
                userId: userId,
            });

            // CRITICAL: Update users table with the CORRECT priceId from Stripe
            // Also store stripeCustomerId for future secure lookups
            await ctx.runMutation(internal.users.updateUserSubscription, {
                userId: userId,
                subscriptionStripeId: subscription.id,
                subscriptionPriceId: priceId,
                subscriptionStatus: subscription.status,
                subscriptionCurrentPeriodEnd: currentPeriodEnd,
                subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            });

            // Store stripeCustomerId for future secure lookups
            await ctx.runMutation(internal.users.updateStripeCustomerId, {
                userId: userId,
                stripeCustomerId: customer.id,
            });

            return {
                found: true,
                subscriptionId: subscription.id,
                priceId: priceId, // Now return the actual priceId from Stripe
                currentPeriodEnd: currentPeriodEnd,
                message: "Subscription synced successfully"
            };
        }

        // Subscription doesn't exist, create it fresh
        try {
            await ctx.runMutation(components.stripe.private.handleSubscriptionCreated, {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customer.id,
                status: subscription.status,
                currentPeriodEnd: currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
                quantity: subscription.items.data[0]?.quantity ?? 1,
                priceId: priceId,
                metadata: { userId: userId },
            });

            // Explicitly set the userId field on the subscription for proper indexing
            await ctx.runMutation(components.stripe.public.updateSubscriptionMetadata, {
                stripeSubscriptionId: subscription.id,
                metadata: { userId: userId },
                userId: userId,
            });

            // Update users table as source of truth
            await ctx.runMutation(internal.users.updateUserSubscription, {
                userId: userId,
                subscriptionStripeId: subscription.id,
                subscriptionPriceId: priceId,
                subscriptionStatus: subscription.status,
                subscriptionCurrentPeriodEnd: currentPeriodEnd,
                subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            });

            // Store stripeCustomerId for future secure lookups
            await ctx.runMutation(internal.users.updateStripeCustomerId, {
                userId: userId,
                stripeCustomerId: customer.id,
            });
        } catch (e) {
            console.error("Failed to create subscription record:", e);
            throw new Error(`Failed to create subscription: ${e}`);
        }

        return {
            found: true,
            subscriptionId: subscription.id,
            priceId: priceId,
            currentPeriodEnd: currentPeriodEnd,
            message: "Subscription synced successfully"
        };
    },
});
