import { query } from "./_generated/server";

// Get the latest changelog entry (for the "What's New" modal)
export const getLatestChangelog = query({
    args: {},
    handler: async (ctx) => {
        const latest = await ctx.db
            .query("changelog")
            .withIndex("by_date")
            .order("desc")
            .first();

        return latest;
    },
});

// Get all changelog entries ordered by date (for the changelog page)
export const getAllChangelogs = query({
    args: {},
    handler: async (ctx) => {
        const changelogs = await ctx.db
            .query("changelog")
            .withIndex("by_date")
            .order("desc")
            .collect();

        return changelogs;
    },
});
