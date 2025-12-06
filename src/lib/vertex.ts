import path from "path";

const defaultLocation = process.env.VERTEXAI_LOCATION || "us-central1";
const defaultProject = process.env.VERTEXAI_PROJECT || "gen-lang-client-0009771189";

// Prefer explicit env var, but fall back to the checked-in key file in the repo root
const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), "gen-lang-client-0009771189-eadb5365e767.json");

// Ensure downstream Google SDKs see the credential file
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

export function buildVertexConfig(model: string) {
  return {
    model,
    project: defaultProject,
    // Gemini 3 models are only served from the global endpoint
    location: model.startsWith("gemini-3") ? "global" : defaultLocation,
    authOptions: {
      keyFile: credentialsPath,
    },
  } as const;
}

export const vertexProject = defaultProject;
export const vertexLocation = defaultLocation;
export const vertexCredentialsPath = credentialsPath;
