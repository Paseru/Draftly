import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId) {
  throw new Error(
    "GOOGLE_CLIENT_ID is not set. Define it in your Convex environment before starting."
  );
}

if (!googleClientSecret) {
  throw new Error(
    "GOOGLE_CLIENT_SECRET is not set. Define it in your Convex environment before starting."
  );
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // If user already exists, just return their ID (no changes needed)
      if (args.existingUserId) {
        return args.existingUserId;
      }

      // New user - create with initialized free trial values
      return ctx.db.insert("users", {
        ...args.profile,
        // Initialize free trial: 1 generation remaining
        remainingGenerations: 1,
        hasUsedFreeTrial: false,
        generationsUsed: 0,
      });
    },
  },
});
