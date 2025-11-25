import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, CircleDashed, Loader2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TextShimmer } from '@/components/ui/TextShimmer';

export type SubStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
};

export type Step = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed';
  details?: string;
  subSteps?: SubStep[];
};

interface ProcessStepsProps {
  steps: Step[];
}

function parseThinkingContent(content: string): string {
  if (!content) return '';
  
  let parsed = content;
  
  // Extraire le contenu entre <thinking> tags s'il existe
  const thinkingMatch = parsed.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkingMatch) {
    parsed = thinkingMatch[1];
  }
  
  // Nettoyer les tags thinking restants (incomplets)
  parsed = parsed.replace(/<\/?thinking>/g, '');
  
  // Nettoyer les backticks de code JSON qui peuvent trainer
  parsed = parsed.replace(/```json[\s\S]*?```/g, '');
  parsed = parsed.replace(/```[\s\S]*?```/g, '');
  
  // Supprimer les lignes dupliquées consécutives
  const lines = parsed.split('\n');
  const cleanedLines: string[] = [];
  let lastLine = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed !== lastLine || trimmed === '') {
      cleanedLines.push(line);
      lastLine = trimmed;
    }
  }
  
  parsed = cleanedLines.join('\n').trim();
  
  return parsed;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={12} className="text-green-500" />;
    case 'running':
      return <Loader2 size={12} className="text-blue-400 animate-spin" />;
    case 'failed':
      return <AlertCircle size={12} className="text-amber-500" />;
    default:
      return <CircleDashed size={12} className="text-zinc-700" />;
  }
}

function SubStepItem({ subStep }: { subStep: SubStep }) {
  const statusColors = {
    completed: 'text-zinc-400',
    running: 'text-blue-400',
    failed: 'text-amber-400',
    pending: 'text-zinc-600'
  };

  return (
    <div className="flex items-start gap-2 text-[11px] py-0.5">
      <div className="shrink-0 mt-0.5">
        <StatusIcon status={subStep.status} />
      </div>
      <div className="flex-1">
        <span className={statusColors[subStep.status]}>{subStep.label}</span>
        {subStep.details && (
          <div className="mt-1 text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
            {subStep.details}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingDetails({ content, isRunning }: { content: string, isRunning: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && isRunning) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, isRunning]);

  // Préparer le contenu pour le markdown
  const preparedContent = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');

  return (
    <div 
      ref={containerRef}
      className="text-[11px] text-zinc-400 leading-relaxed max-h-64 overflow-y-auto pl-2 pr-1 scroll-smooth"
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
          a: ({ children, href }) => <a href={href} className="text-blue-400 hover:underline">{children}</a>,
          code: ({ children }) => <code className="bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-[10px]">{children}</code>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-600 pl-2 my-1 text-zinc-500 italic">{children}</blockquote>,
        }}
      >
        {preparedContent}
      </ReactMarkdown>
      {isRunning && <span className="inline-block w-1.5 h-3 ml-1 bg-blue-500 align-middle animate-pulse rounded-sm"/>}
    </div>
  );
}

export default function ProcessSteps({ steps }: ProcessStepsProps) {
  const [openStepIds, setOpenStepIds] = useState<Set<string>>(new Set());

  const toggleStep = (id: string) => {
    setOpenStepIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!steps || steps.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const key = `${step.id}-${index}`;
          const parsedDetails = parseThinkingContent(step.details || '');
          
          if (step.label === 'Thinking' && step.status === 'running') {
             return (
               <div key={key} className="flex items-center gap-2.5 p-2.5 bg-[#1e1e1e] rounded border border-[#27272a]">
                 <div className="shrink-0">
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                 </div>
                 <TextShimmer className="font-medium text-[11px]" duration={1}>Thinking...</TextShimmer>
               </div>
             );
          }

          if (step.id === 'planning' && step.status === 'running' && !parsedDetails) {
             return (
               <div key={key} className="flex items-center gap-2.5 p-2.5 bg-[#1e1e1e] rounded border border-[#27272a]">
                 <div className="shrink-0">
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                 </div>
                 <TextShimmer className="font-medium text-[11px]" duration={1}>Thinking...</TextShimmer>
               </div>
             );
          }

          const hasDetails = step.details || (step.subSteps && step.subSteps.length > 0);
          const isOpen = openStepIds.has(step.id) || step.status === 'running';

          return (
            <div key={key} className="flex flex-col bg-[#18181b] rounded-lg border border-[#27272a] overflow-hidden transition-all shadow-sm">
              
              {/* Step Header */}
              <div 
                className={`flex items-center gap-2.5 text-[11px] px-4 py-3 bg-[#202023] border-b border-[#27272a] transition-colors ${hasDetails ? 'cursor-pointer hover:bg-[#27272a]' : ''}`}
                onClick={() => hasDetails && toggleStep(step.id)}
              >
                <div className="shrink-0">
                  <StatusIcon status={step.status} />
                </div>
                
                <span className={`flex-1 font-medium ${step.status === 'completed' ? 'text-zinc-500' : step.status === 'running' ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {step.label}
                </span>

                {hasDetails && (
                  <div className="text-zinc-600">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              {isOpen && hasDetails && (
                <div className="px-4 py-3 space-y-1 bg-[#18181b]">
                  {/* Sub-steps */}
                  {step.subSteps && step.subSteps.length > 0 && (
                    <div className="border-l border-zinc-800 pl-2 ml-0.5 space-y-0.5">
                      {step.subSteps.map((subStep, subIndex) => (
                        <SubStepItem key={`${subStep.id}-${subIndex}`} subStep={subStep} />
                      ))}
                    </div>
                  )}
                  
                  {/* Thinking details */}
                  {parsedDetails && (
                    <ThinkingDetails content={parsedDetails} isRunning={step.status === 'running'} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
