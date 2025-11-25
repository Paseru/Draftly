import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { TextShimmer } from '@/components/ui/TextShimmer';
import ReactMarkdown from 'react-markdown';

interface ThinkingBlockProps {
  content: string;
  isComplete?: boolean;
}

function cleanThinkingContent(content: string): string {
  let cleaned = content;
  
  // Extraire le contenu entre <thinking> tags s'il existe
  const thinkingMatch = cleaned.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkingMatch) {
    cleaned = thinkingMatch[1];
  }
  
  // Nettoyer les tags thinking restants
  cleaned = cleaned.replace(/<\/?thinking>/g, '');
  
  // Nettoyer les blocs de code JSON
  cleaned = cleaned.replace(/```json[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  
  return cleaned.trim();
}

export default function ThinkingBlock({ content, isComplete = false }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-close when complete
  useEffect(() => {
    if (isComplete) {
      setIsOpen(false);
    }
  }, [isComplete]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isOpen]);

  const cleanContent = cleanThinkingContent(content);

  if (isComplete) return null;
  if (!cleanContent) return null;

  // Préparer pour markdown
  const preparedContent = cleanContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');

  return (
    <div className="w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2.5 bg-[#202023] border border-[#27272a] rounded-lg transition-all duration-200 w-full max-w-xl cursor-pointer hover:bg-[#27272a]"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 flex items-center justify-center">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
             </span>
          </div>
          <TextShimmer className="text-[11px] font-medium tracking-wide" duration={1}>Thinking</TextShimmer>
        </div>
        
        <div className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown size={14} />
        </div>
      </button>
      
      {isOpen && cleanContent && (
        <div 
          ref={contentRef}
          className="mt-2 p-3 rounded border border-[#27272a] bg-[#18181b] max-h-48 overflow-y-auto text-[11px] text-[#a1a1aa] leading-relaxed shadow-inner max-w-xl"
        >
          <ReactMarkdown
            components={{
              strong: ({ children }) => <span className="font-semibold text-zinc-300">{children}</span>,
              em: ({ children }) => <span className="italic text-zinc-300">{children}</span>,
              ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="text-zinc-400">{children}</li>,
              p: ({ children }) => <p className="my-1 text-zinc-400">{children}</p>,
              h1: ({ children }) => <h1 className="text-sm font-bold text-zinc-200 mt-2 mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xs font-bold text-zinc-200 mt-2 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xs font-semibold text-zinc-300 mt-1.5 mb-0.5">{children}</h3>,
              code: ({ children }) => <code className="bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-[10px]">{children}</code>,
            }}
          >
            {preparedContent}
          </ReactMarkdown>
          <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-blue-500 animate-pulse rounded-sm"/>
        </div>
      )}
    </div>
  );
}
