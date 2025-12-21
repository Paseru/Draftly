import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up stale queue entries daily at 3am UTC
// This handles:
// - Active slots that have been held for too long (browser crash, etc.)
// - Waiting entries that have expired
// - Completed entries that need to be removed
crons.daily(
    "cleanup stale queue entries",
    { hourUTC: 3, minuteUTC: 0 },
    internal.queue.cleanupStaleEntries
);

export default crons;
