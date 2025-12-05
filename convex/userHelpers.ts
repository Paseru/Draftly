import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query to get user email from users table
export const getUserEmail = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args): Promise<string | null> => {
        const user = await ctx.db.get(args.userId);
        return user?.email ?? null;
    },
});
