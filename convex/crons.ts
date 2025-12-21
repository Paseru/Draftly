import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up stale queue entries every minute
// This handles:
// - Active slots that have been held for too long (browser crash, etc.)
// - Waiting entries that have expired
// - Completed entries that need to be removed
crons.interval(
    "cleanup stale queue entries",
    { minutes: 1 },
    internal.queue.cleanupStaleEntries
);

export default crons;
