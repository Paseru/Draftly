
import { ChatVertexAI } from "@langchain/google-vertexai";

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RequestBody {
  html: string;
}

export async function POST(request: Request) {
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
      model: "gemini-3-pro-preview",
      location: "global", // Gemini 3 models are served from the global endpoint
      temperature: 0.2, // Lower temperature for more analytical output
    });

    const prompt = `
You are an expert UI/UX designer and frontend architect.
I will provide you with the HTML code of the first screen of a web application.
Your task is to reverse-engineer the Design System used in this screen.

Please analyze the code and generate a comprehensive Design System documentation in Markdown format.

Include the following sections:
1. **Core Principles**: The overall aesthetic and vibe (e.g., "Minimalist Dark Mode", "Corporate Clean").
2. **Color Palette**: Identify the primary, secondary, background, and accent colors used. List them with their Tailwind classes (e.g., \`bg-blue-500\`) and/or hex codes if inline styles are used.
3. **Typography**: Font families, sizes (h1 vs p), weights, and text colors.
4. **Spacing & Layout**: Padding/margin scales, container widths, grid/flex patterns.
5. **Components**: Document the reusable patterns found:
    - Buttons (primary/secondary variants)
    - Cards / Containers
    - Inputs / Form Elements
    - Navigation items
6. **Iconography**: The style of icons used (e.g., Lucide).

At the very end of the markdown document, include a section titled "## Reference HTML" and include the raw HTML code provided inside a code block.

Here is the HTML code:
\`\`\`html
${html}
\`\`\`
`;

    const response = await llm.invoke(prompt);

    return new Response(JSON.stringify({ markdown: response.content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Design System Generation Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate design system" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
