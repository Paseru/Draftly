import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, PauseCircle } from 'lucide-react';
import { TextShimmer } from '@/components/ui/TextShimmer';
import ReactMarkdown from 'react-markdown';

interface ThinkingBlockProps {
  content: string;
  isComplete?: boolean;
  isPaused?: boolean;
  durationSeconds?: number;
}

function cleanThinkingContent(content: string): string {
  let cleaned = content;
  
  const thinkingMatch = cleaned.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkingMatch) {
    cleaned = thinkingMatch[1];
  }
  
  cleaned = cleaned.replace(/<\/?thinking>/g, '');
  cleaned = cleaned.replace(/```json[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  
  return cleaned.trim();
}

export default function ThinkingBlock({ content, isComplete = false, isPaused = false, durationSeconds }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isComplete || isPaused) {
      setIsOpen(false);
    }
  }, [isComplete, isPaused]);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isOpen]);

  const cleanContent = cleanThinkingContent(content);
  const hasContent = cleanContent.length > 0;

  // Don't render only if complete AND no content (edge case)
  if (isComplete && !hasContent) return null;

  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-[#27272a] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => hasContent && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hasContent ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-xs font-medium text-zinc-500">
                Thought for {durationSeconds || 0}s
              </span>
            </>
          ) : isPaused ? (
            <>
              <PauseCircle size={14} className="text-amber-500" />
              <span className="text-xs font-medium text-zinc-500">Thinking paused</span>
            </>
          ) : (
            <>
              <Loader2 size={14} className="text-blue-500 animate-spin" />
              <TextShimmer className="text-xs font-medium">Thinking...</TextShimmer>
            </>
          )}
        </div>
        {hasContent && (
          <div className="text-zinc-500">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        )}
      </button>
      
      {/* Content - smooth expand/collapse */}
      {hasContent && (
        <div 
          className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${
            isOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div 
            ref={contentRef}
            className="px-4 pb-4 overflow-y-auto border-t border-[#27272a]"
            style={{ maxHeight: isOpen ? '300px' : '0' }}
          >
            <div className="text-[11px] text-zinc-400 leading-relaxed pt-3 thinking-content">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => <strong className="text-zinc-200 font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-zinc-300 italic">{children}</em>,
                  p: ({ children }) => <p className="my-1.5">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-zinc-400">{children}</li>,
                  h1: ({ children }) => <h1 className="text-xs font-bold text-zinc-200 mt-3 mb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-[11px] font-bold text-zinc-200 mt-2 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-[11px] font-semibold text-zinc-300 mt-2 mb-1">{children}</h3>,
                  code: ({ children }) => <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300 text-[10px]">{children}</code>,
                }}
              >
                {cleanContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
