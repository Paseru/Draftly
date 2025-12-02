import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          send(JSON.stringify({ error: "GOOGLE_API_KEY missing" }));
          controller.close();
          return;
        }

        const llm = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-pro",
          temperature: 1.0,
          maxOutputTokens: 8192,
          apiKey,
          streaming: true,
        });

        send(JSON.stringify({ status: "starting", time: new Date().toISOString() }));

        const streamResponse = await llm.stream(prompt);
        
        for await (const chunk of streamResponse) {
          const content = chunk.content;
          send(JSON.stringify({ 
            type: "chunk", 
            content,
            time: new Date().toISOString() 
          }));
        }

        send(JSON.stringify({ status: "done", time: new Date().toISOString() }));
        controller.close();

      } catch (error) {
        send(JSON.stringify({ error: String(error) }));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
