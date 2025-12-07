import path from "path";

const defaultLocation = process.env.VERTEXAI_LOCATION || "us-central1";
const defaultProject = process.env.VERTEXAI_PROJECT || "gen-lang-client-0009771189";

// Check if we have inline credentials (for production/Vercel)
const inlineCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Fall back to file-based credentials for local development
const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), "gen-lang-client-0009771189-eadb5365e767.json");

// Ensure downstream Google SDKs see the credential file (only if not using inline)
if (!inlineCredentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

// Parse inline credentials if available
let parsedCredentials: Record<string, unknown> | null = null;
if (inlineCredentials) {
  console.log("[Vertex] GOOGLE_SERVICE_ACCOUNT_KEY found, length:", inlineCredentials.length);
  console.log("[Vertex] First 50 chars:", inlineCredentials.substring(0, 50));
  try {
    parsedCredentials = JSON.parse(inlineCredentials);
    console.log("[Vertex] ✅ Credentials parsed successfully");
    console.log("[Vertex] Project ID:", parsedCredentials?.project_id);
    console.log("[Vertex] Client email:", parsedCredentials?.client_email);
  } catch (e) {
    console.error("[Vertex] ❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", e);
    console.error("[Vertex] Raw value (first 100 chars):", inlineCredentials.substring(0, 100));
  }
} else {
  console.log("[Vertex] No GOOGLE_SERVICE_ACCOUNT_KEY found, using keyFile:", credentialsPath);
}

export function buildVertexConfig(model: string) {
  const baseConfig = {
    model,
    project: defaultProject,
    // Gemini 3 models are only served from the global endpoint
    location: model.startsWith("gemini-3") ? "global" : defaultLocation,
  };

  // Use inline credentials if available (production), otherwise use keyFile (local)
  if (parsedCredentials) {
    return {
      ...baseConfig,
      authOptions: {
        credentials: parsedCredentials,
      },
    } as const;
  }

  return {
    ...baseConfig,
    authOptions: {
      keyFile: credentialsPath,
    },
  } as const;
}

export const vertexProject = defaultProject;
export const vertexLocation = defaultLocation;
export const vertexCredentialsPath = credentialsPath;
