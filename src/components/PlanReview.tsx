import React, { useState } from 'react';
import { Check, ChevronRight, AlertCircle, RefreshCcw, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PlannedScreen {
  id: string;
  name: string;
  description: string;
}

interface Props {
  screens: PlannedScreen[];
  onApprove: () => void;
  onRequestRefine: () => void;
}

export default function PlanReview({ screens, onApprove, onRequestRefine }: Props) {
  return (
    <div className="w-full max-w-xl bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="px-4 py-3 border-b border-[#27272a] bg-[#202023] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span className="text-xs font-medium text-zinc-300 tracking-wide">Proposed Architecture</span>
        </div>
        <span className="text-[10px] text-zinc-500 bg-[#27272a] px-2 py-0.5 rounded-full border border-white/5">
          {screens.length} Screens
        </span>
      </div>

      <div className="p-0 min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar">
        {screens.map((screen, idx) => (
          <div 
            key={screen.id} 
            className="px-4 py-3 border-b border-[#27272a] last:border-0 hover:bg-[#202023]/50 transition-colors group"
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
                      strong: ({node, ...props}) => <span className="font-semibold text-zinc-300" {...props} />,
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

      <div className="px-3 py-3 border-t border-[#27272a] bg-[#202023]">
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
    </div>
  );
}
