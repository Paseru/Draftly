import type { AuthConfig } from "convex/server";

// IMPORTANT:
// We use @convex-dev/auth which emits JWTs with:
// - issuer (iss) = CONVEX_SITE_URL (ex: https://amiable-salmon-708.convex.cloud)
// - audience (aud) = "convex"
// For the Convex backend to accept these tokens, the OIDC provider here
// must point to CONVEX_SITE_URL with applicationID "convex".

const convexSiteUrl = process.env.CONVEX_SITE_URL;
if (!convexSiteUrl) {
  throw new Error(
    "CONVEX_SITE_URL is not set. It must be defined for Convex Auth tokens to be accepted."
  );
}

const authConfig: AuthConfig = {
  providers: [
    {
      domain: convexSiteUrl,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
