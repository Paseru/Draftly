import { ChatVertexAI } from "@langchain/google-vertexai";
import { buildVertexConfig } from "@/lib/vertex";

export const runtime = 'nodejs';
export const maxDuration = 30;

interface RequestBody {
    prompt: string;
}

export async function POST(request: Request) {
    try {
        const body: RequestBody = await request.json();
        const { prompt } = body;

        if (!prompt) {
            return new Response(JSON.stringify({ error: "No prompt provided" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Use Gemini Flash for fast, cost-effective extraction
        const llm = new ChatVertexAI({
            ...buildVertexConfig("gemini-2.0-flash"),
            temperature: 0.1, // Very low temperature for consistent output
            maxOutputTokens: 50, // We only need a short name
        });

        const extractionPrompt = `You are a naming expert. Given the following user prompt describing a web application they want to build, extract or generate a short, catchy application name (2-5 words maximum).

The name should be:
- Professional and memorable
- Descriptive of the app's purpose
- In the same language as the prompt (French prompt = French name, English prompt = English name)

User prompt: "${prompt}"

Respond with ONLY the application name, nothing else. No quotes, no explanations, no punctuation.`;

        const response = await llm.invoke(extractionPrompt);
        const extractedName = String(response.content).trim();

        // Validate the response - if it's too long or empty, fallback
        if (!extractedName || extractedName.length > 50 || extractedName.includes('\n')) {
            // Fallback: use first 40 chars of prompt
            const fallback = prompt.slice(0, 40) + (prompt.length > 40 ? '...' : '');
            return new Response(JSON.stringify({ name: fallback }), {
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
        // On error, don't fail - just return a generic fallback
        return new Response(JSON.stringify({ error: "Failed to extract name" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
