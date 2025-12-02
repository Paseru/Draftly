"use client";

import { useState, useRef } from "react";

export default function TestPage() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setOutput([]);
    setIsLoading(true);
    
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: abortRef.current.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter(line => line.startsWith("data: "));
        
        for (const line of lines) {
          const data = line.replace("data: ", "");
          setOutput(prev => [...prev, data]);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setOutput(prev => [...prev, JSON.stringify({ error: String(e) })]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  return (
    <div style={{ padding: 40, fontFamily: "monospace", background: "#fff", minHeight: "100vh" }}>
      <h1>Test Gemini 3 Pro Direct</h1>
      
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt..."
          style={{ 
            width: 400, 
            padding: 10, 
            fontSize: 16,
            border: "1px solid #ccc",
            marginRight: 10
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button 
          onClick={handleSubmit} 
          disabled={isLoading}
          style={{ padding: "10px 20px", fontSize: 16, marginRight: 10 }}
        >
          {isLoading ? "Loading..." : "Send"}
        </button>
        {isLoading && (
          <button onClick={handleStop} style={{ padding: "10px 20px", fontSize: 16 }}>
            Stop
          </button>
        )}
      </div>

      <div style={{ 
        background: "#f5f5f5", 
        padding: 20, 
        borderRadius: 8,
        maxHeight: 500,
        overflow: "auto"
      }}>
        <h3>Raw Stream Output:</h3>
        {output.length === 0 && <p style={{ color: "#999" }}>No output yet...</p>}
        {output.map((line, i) => (
          <pre key={i} style={{ 
            margin: "5px 0", 
            padding: 5, 
            background: "#e0e0e0",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          }}>
            {line}
          </pre>
        ))}
      </div>
    </div>
  );
}
