import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Maximum number of concurrent generations allowed */
const MAX_CONCURRENT_SLOTS = 5;

/** Time after which an active slot is considered abandoned (5 minutes) */
const SLOT_TIMEOUT_MS = 5 * 60 * 1000;

/** Time after which a waiting queue entry expires (10 minutes) */
const QUEUE_ENTRY_TIMEOUT_MS = 10 * 60 * 1000;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Check the current user's position in the queue.
 * Returns null if user is not in queue, 0 if user has an active slot,
 * or their position (1-indexed) if waiting.
 */
export const checkPosition = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Check if user has an active slot
        const activeEntry = await ctx.db
            .query("generationQueue")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (activeEntry) {
            return { position: 0, status: "active" as const, entryId: activeEntry._id };
        }

        // Check if user is waiting in queue
        const waitingEntry = await ctx.db
            .query("generationQueue")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("status"), "waiting"))
            .first();

        if (!waitingEntry) {
            return null;
        }

        // Count how many people are ahead in the queue
        const allWaiting = await ctx.db
            .query("generationQueue")
            .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
            .collect();

        // Sort by createdAt to get FIFO order
        const sorted = allWaiting.sort((a, b) => a.createdAt - b.createdAt);
        const position = sorted.findIndex((e) => e._id === waitingEntry._id) + 1;

        // Count active slots to estimate wait time
        const activeCount = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        return {
            position,
            status: "waiting" as const,
            entryId: waitingEntry._id,
            activeSlots: activeCount.length,
            maxSlots: MAX_CONCURRENT_SLOTS,
        };
    },
});

/**
 * Get queue stats for monitoring/debugging
 */
export const getQueueStats = query({
    args: {},
    handler: async (ctx) => {
        const activeEntries = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        const waitingEntries = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "waiting"))
            .collect();

        return {
            activeSlots: activeEntries.length,
            maxSlots: MAX_CONCURRENT_SLOTS,
            waitingCount: waitingEntries.length,
            availableSlots: Math.max(0, MAX_CONCURRENT_SLOTS - activeEntries.length),
        };
    },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Join the generation queue. If a slot is available, immediately acquire it.
 * Otherwise, add user to waiting queue.
 */
export const joinQueue = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const now = Date.now();

        // Check if user already has an active slot or is waiting
        const existingEntry = await ctx.db
            .query("generationQueue")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "active"),
                    q.eq(q.field("status"), "waiting")
                )
            )
            .first();

        if (existingEntry) {
            // User already in queue or has slot
            if (existingEntry.status === "active") {
                return {
                    position: 0,
                    status: "active" as const,
                    entryId: existingEntry._id,
                    alreadyInQueue: true,
                };
            }
            // Return existing waiting position
            const allWaiting = await ctx.db
                .query("generationQueue")
                .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
                .collect();
            const sorted = allWaiting.sort((a, b) => a.createdAt - b.createdAt);
            const position = sorted.findIndex((e) => e._id === existingEntry._id) + 1;

            return {
                position,
                status: "waiting" as const,
                entryId: existingEntry._id,
                alreadyInQueue: true,
            };
        }

        // Count current active slots
        const activeEntries = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        const hasAvailableSlot = activeEntries.length < MAX_CONCURRENT_SLOTS;

        if (hasAvailableSlot) {
            // Immediately acquire a slot
            const entryId = await ctx.db.insert("generationQueue", {
                userId,
                status: "active",
                slotAcquiredAt: now,
                createdAt: now,
                updatedAt: now,
            });

            return {
                position: 0,
                status: "active" as const,
                entryId,
                alreadyInQueue: false,
            };
        }

        // No slot available, join waiting queue
        const entryId = await ctx.db.insert("generationQueue", {
            userId,
            status: "waiting",
            createdAt: now,
            updatedAt: now,
        });

        // Calculate position
        const allWaiting = await ctx.db
            .query("generationQueue")
            .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
            .collect();
        const sorted = allWaiting.sort((a, b) => a.createdAt - b.createdAt);
        const position = sorted.findIndex((e) => e._id === entryId) + 1;

        return {
            position,
            status: "waiting" as const,
            entryId,
            alreadyInQueue: false,
        };
    },
});

/**
 * Try to acquire a slot. Call this when user's position becomes 0.
 * Returns success if slot acquired, or new position if still waiting.
 */
export const tryAcquireSlot = mutation({
    args: {
        entryId: v.id("generationQueue"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const entry = await ctx.db.get(args.entryId);
        if (!entry || entry.userId !== userId) {
            throw new Error("Queue entry not found or not owned by user");
        }

        if (entry.status === "active") {
            // Already has slot
            return { success: true, status: "active" as const };
        }

        if (entry.status !== "waiting") {
            throw new Error("Queue entry is not in waiting status");
        }

        // Count active slots
        const activeEntries = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        if (activeEntries.length >= MAX_CONCURRENT_SLOTS) {
            // Still no slot available
            const allWaiting = await ctx.db
                .query("generationQueue")
                .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
                .collect();
            const sorted = allWaiting.sort((a, b) => a.createdAt - b.createdAt);
            const position = sorted.findIndex((e) => e._id === args.entryId) + 1;

            return { success: false, status: "waiting" as const, position };
        }

        // Acquire the slot
        await ctx.db.patch(args.entryId, {
            status: "active",
            slotAcquiredAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { success: true, status: "active" as const };
    },
});

/**
 * Release a slot when generation is complete or user cancels.
 */
export const releaseSlot = mutation({
    args: {
        entryId: v.optional(v.id("generationQueue")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return { success: false, reason: "Not authenticated" };
        }

        let entry;

        if (args.entryId) {
            entry = await ctx.db.get(args.entryId);
        } else {
            // Find any active entry for this user
            entry = await ctx.db
                .query("generationQueue")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .filter((q) =>
                    q.or(
                        q.eq(q.field("status"), "active"),
                        q.eq(q.field("status"), "waiting")
                    )
                )
                .first();
        }

        if (!entry) {
            return { success: false, reason: "No queue entry found" };
        }

        if (entry.userId !== userId) {
            return { success: false, reason: "Not owner of queue entry" };
        }

        // Mark as completed (will be cleaned up by cron)
        await ctx.db.patch(entry._id, {
            status: "completed",
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Leave the queue without completing (user cancelled)
 */
export const leaveQueue = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return { success: false };
        }

        // Find and delete any queue entries for this user
        const entries = await ctx.db
            .query("generationQueue")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "active"),
                    q.eq(q.field("status"), "waiting")
                )
            )
            .collect();

        for (const entry of entries) {
            await ctx.db.delete(entry._id);
        }

        return { success: true, deletedCount: entries.length };
    },
});

// ============================================================================
// INTERNAL MUTATIONS (for cron cleanup)
// ============================================================================

/**
 * Clean up stale queue entries:
 * - Active slots older than SLOT_TIMEOUT_MS (abandoned)
 * - Waiting entries older than QUEUE_ENTRY_TIMEOUT_MS (expired)
 * - Completed entries (already done)
 */
export const cleanupStaleEntries = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        let cleanedCount = 0;

        // Clean up abandoned active slots
        const activeEntries = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        for (const entry of activeEntries) {
            const slotAge = now - (entry.slotAcquiredAt || entry.createdAt);
            if (slotAge > SLOT_TIMEOUT_MS) {
                await ctx.db.delete(entry._id);
                cleanedCount++;
                console.log(`[Queue Cleanup] Removed stale active slot for user ${entry.userId}`);
            }
        }

        // Clean up expired waiting entries
        const waitingEntries = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "waiting"))
            .collect();

        for (const entry of waitingEntries) {
            const entryAge = now - entry.createdAt;
            if (entryAge > QUEUE_ENTRY_TIMEOUT_MS) {
                await ctx.db.delete(entry._id);
                cleanedCount++;
                console.log(`[Queue Cleanup] Removed expired waiting entry for user ${entry.userId}`);
            }
        }

        // Clean up completed entries (immediately)
        const completedEntries = await ctx.db
            .query("generationQueue")
            .withIndex("by_status", (q) => q.eq("status", "completed"))
            .collect();

        for (const entry of completedEntries) {
            await ctx.db.delete(entry._id);
            cleanedCount++;
        }

        return { cleanedCount };
    },
});
