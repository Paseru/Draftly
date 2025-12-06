import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCcw, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PlannedScreen {
  id: string;
  name: string;
  description: string;
}

interface Props {
  screens: PlannedScreen[];
  onApprove?: () => void;
  onRequestRefine?: () => void;
  isApproved?: boolean;
}

export default function PlanReview({ screens, onApprove, onRequestRefine, isApproved = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(!isApproved);

  // Auto-collapse when approved
  useEffect(() => {
    if (isApproved) {
      requestAnimationFrame(() => setIsExpanded(false));
    }
  }, [isApproved]);

  return (
    <div className="w-full max-w-xl bg-[#1e1e1e] border border-[#27272a] rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header - clickable when approved */}
      <div 
        onClick={() => isApproved && setIsExpanded(!isExpanded)}
        className={`px-4 py-3 flex items-center justify-between ${isApproved ? 'cursor-pointer hover:bg-white/5' : ''}`}
      >
        <div className="flex items-center gap-2">
          {isApproved ? (
            <Layers size={14} className="text-purple-500" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          )}
          <span className={`text-xs font-medium tracking-wide ${isApproved ? 'text-zinc-500' : 'text-white'}`}>
            {isApproved ? 'Architecture Approved' : 'Proposed Architecture'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 bg-[#27272a] px-2 py-0.5 rounded-full border border-white/5">
            {screens.length} Screens
          </span>
          {isApproved && (
            <div className="text-zinc-500">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
        </div>
      </div>

      {/* Content - smooth expand/collapse */}
      <div 
        className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[600px] opacity-100 border-t border-[#27272a]' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-0 max-h-[400px] overflow-y-auto custom-scrollbar bg-[#181818]">
          {screens.map((screen, idx) => (
            <div 
              key={screen.id} 
              className="px-4 py-3 border-b border-[#27272a] last:border-0 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-4 h-4 rounded bg-[#27272a] text-zinc-500 text-[9px] flex items-center justify-center font-mono border border-white/5 group-hover:text-zinc-300 group-hover:border-zinc-700">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-[12px] font-medium text-zinc-200 mb-1">{screen.name}</h4>
                  <div className="text-[11px] text-zinc-500 leading-relaxed markdown-content">
                    <ReactMarkdown 
                      components={{
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        strong: ({node, ...props}) => <span className="font-semibold text-zinc-300" {...props} />,
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        p: ({node, ...props}) => <p className="my-0.5" {...props} />
                      }}
                    >
                      {screen.description}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions - only show when not approved */}
        {!isApproved && onApprove && onRequestRefine && (
          <div className="px-3 py-3 border-t border-[#27272a]">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onRequestRefine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a] transition-all cursor-pointer"
              >
                <RefreshCcw size={12} />
                Refine Plan
              </button>
              <button
                onClick={onApprove}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-[11px] font-medium bg-zinc-100 hover:bg-white text-zinc-900 shadow-lg shadow-white/5 transform hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <Layers size={12} />
                Approve & Build
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
