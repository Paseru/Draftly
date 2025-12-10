import { ChatVertexAI } from "@langchain/google-vertexai";
import { buildVertexConfig } from "@/lib/vertex";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export const runtime = 'nodejs';
export const maxDuration = 30;

interface RequestBody {
    html: string;
}

export async function POST(request: Request) {
    // SECURITY: Verify authentication
    const token = await convexAuthNextjsToken();
    if (!token) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body: RequestBody = await request.json();
        const { html } = body;

        if (!html) {
            return new Response(JSON.stringify({ error: "No HTML provided" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const llm = new ChatVertexAI({
            ...buildVertexConfig("gemini-2.0-flash"),
            temperature: 0.1,
            maxOutputTokens: 30,
        });

        const extractionPrompt = `Extract the app name from this HTML. Look at <title>, headers, or logo text. Return ONLY the name, nothing else.

${html}`;

        const response = await llm.invoke(extractionPrompt);
        const extractedName = String(response.content).trim();

        if (!extractedName || extractedName.length > 50 || extractedName.includes('\n')) {
            return new Response(JSON.stringify({ name: "My Project" }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ name: extractedName }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Name Extraction Error:", error);
        return new Response(JSON.stringify({ error: "Failed to extract name" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
