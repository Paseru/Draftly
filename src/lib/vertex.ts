import path from "path";
import fs from "fs";
import os from "os";

const defaultLocation = process.env.VERTEXAI_LOCATION || "us-central1";
const defaultProject = process.env.VERTEXAI_PROJECT || "gen-lang-client-0009771189";

// Check if we have inline credentials (for production/Railway)
const inlineCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Fall back to file-based credentials for local development
let credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), "gen-lang-client-0009771189-eadb5365e767.json");

// If we have inline credentials, write them to a temp file
// This is necessary because the Google Auth SDK requires a file path
if (inlineCredentials) {
  try {
    // Parse to validate JSON
    JSON.parse(inlineCredentials);

    // Write to temp file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, "gcp-credentials.json");
    fs.writeFileSync(tempFilePath, inlineCredentials, { encoding: "utf-8" });

    // Update credentials path to point to temp file
    credentialsPath = tempFilePath;
    console.log("[Vertex] Using inline credentials");
  } catch (e) {
    console.error("[Vertex] Failed to parse/write credentials");
  }
}

// Set GOOGLE_APPLICATION_CREDENTIALS for the Google SDK
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

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
