import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";

const http = httpRouter();

auth.addHttpRoutes(http);

// Custom event handler to fix bugs in @convex-dev/stripe and sync to users table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleSubscriptionEvent = async (ctx: any, event: Stripe.Event) => {
    if (event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted") {

        const subscription = event.data.object as Stripe.Subscription;
        const subAny = subscription as unknown as Record<string, unknown>;

        // Get correct values from the subscription object
        const correctCurrentPeriodEnd = typeof subAny.current_period_end === 'number'
            ? subAny.current_period_end
            : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

        const priceId = subscription.items?.data?.[0]?.price?.id || "";
        const userId = subscription.metadata?.userId;

        console.log(`🔧 Handling ${event.type} for subscription ${subscription.id}:`, {
            currentPeriodEnd: new Date(correctCurrentPeriodEnd * 1000).toISOString(),
            priceId: priceId,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            userId: userId
        });

        // Update component tables
        if (event.type === "customer.subscription.deleted") {
            await ctx.runMutation(components.stripe.private.handleSubscriptionDeleted, {
                stripeSubscriptionId: subscription.id,
            });
        } else if (event.type === "customer.subscription.updated") {
            // For subscription.updated, delete and recreate to update priceId
            try {
                await ctx.runMutation(components.stripe.private.handleSubscriptionDeleted, {
                    stripeSubscriptionId: subscription.id,
                });
            } catch (e) {
                console.log("Delete failed (might not exist):", e);
            }

            await ctx.runMutation(components.stripe.private.handleSubscriptionCreated, {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                status: subscription.status,
                currentPeriodEnd: correctCurrentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
                quantity: subscription.items.data[0]?.quantity ?? 1,
                priceId: priceId,
                metadata: subscription.metadata || {},
            });
        } else {
            // For created, just fix the currentPeriodEnd
            await ctx.runMutation(components.stripe.private.handleSubscriptionUpdated, {
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                currentPeriodEnd: correctCurrentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
                quantity: subscription.items.data[0]?.quantity ?? 1,
                metadata: subscription.metadata || {},
            });
        }

        // CRITICAL: Also update the users table (source of truth for UI)
        if (userId) {
            try {
                // For deleted subscriptions, clear the user's subscription data
                if (event.type === "customer.subscription.deleted" && subscription.status === "canceled") {
                    await ctx.runMutation(internal.users.clearUserSubscription, {
                        userId: userId as any,
                    });
                    console.log(`✅ Cleared subscription for user ${userId}`);
                } else {
                    // For created/updated, sync the subscription data
                    await ctx.runMutation(internal.users.updateUserSubscription, {
                        userId: userId as any,
                        subscriptionStripeId: subscription.id,
                        subscriptionPriceId: priceId,
                        subscriptionStatus: subscription.status,
                        subscriptionCurrentPeriodEnd: correctCurrentPeriodEnd,
                        subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
                    });
                    console.log(`✅ Updated users table for user ${userId}`);
                }
            } catch (e) {
                console.error("Failed to update users table:", e);
            }
        } else {
            console.warn("⚠️ No userId in subscription metadata, users table not updated");
        }
    }
};

// Register Stripe webhook handler at /stripe/webhook with custom event handler
registerRoutes(http, components.stripe, {
    webhookPath: "/stripe/webhook",
    onEvent: handleSubscriptionEvent,
});

export default http;
