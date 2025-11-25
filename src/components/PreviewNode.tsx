import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Maximize2, Code } from 'lucide-react';

interface PreviewNodeProps {
  data: {
    label: string;
    html: string;
    onExpand?: (html: string) => void;
    onShowCode?: (html: string) => void;
    viewMode?: 'desktop' | 'mobile';
  };
}

const PreviewNode = ({ data }: PreviewNodeProps) => {
  const viewMode = data.viewMode || 'desktop';
  const isMobile = viewMode === 'mobile';
  
  // Desktop dimensions
  if (!isMobile) {
    const w = 1920;
    const h = 1080;

    return (
      <div 
        style={{ width: w, height: h }}
        className="relative flex flex-col bg-[#1e1e1e] rounded-lg border border-[#3e3e42] overflow-hidden shadow-2xl"
      >
        {/* Simple header */}
        <div className="h-9 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            </div>
            <span className="text-[#a1a1aa] text-xs ml-2">{data.label}</span>
          </div>
          <div className="flex gap-1">
            <button 
              className="p-1.5 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded cursor-pointer"
              onClick={() => data.onShowCode?.(data.html)}
            >
              <Code size={14} />
            </button>
            <button 
              className="p-1.5 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded cursor-pointer"
              onClick={() => data.onExpand?.(data.html)}
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Content area */}
        {data.html ? (
          <iframe 
            srcDoc={data.html}
            className="flex-1 w-full border-none bg-[#09090b]"
            title={data.label}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex-1 bg-[#09090b] animate-pulse p-8 flex flex-col gap-6">
            {/* Header Skeleton */}
            <div className="w-full h-16 bg-zinc-900 rounded-lg flex items-center px-6 justify-between border border-zinc-800/50">
              <div className="h-6 w-32 bg-zinc-800 rounded"></div>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-zinc-800"></div>
                <div className="h-8 w-8 rounded-full bg-zinc-800"></div>
              </div>
            </div>
            
            <div className="flex gap-6 flex-1">
              {/* Sidebar Skeleton */}
              <div className="w-64 h-full bg-zinc-900 rounded-lg border border-zinc-800/50 p-4 flex flex-col gap-3">
                <div className="h-4 w-3/4 bg-zinc-800 rounded mb-4"></div>
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-8 w-full bg-zinc-800/50 rounded"></div>
                ))}
              </div>
              
              {/* Main Content Skeleton */}
              <div className="flex-1 h-full flex flex-col gap-6">
                <div className="w-full h-64 bg-zinc-900 rounded-lg border border-zinc-800/50"></div>
                <div className="grid grid-cols-2 gap-6 flex-1">
                  <div className="bg-zinc-900 rounded-lg border border-zinc-800/50"></div>
                  <div className="bg-zinc-900 rounded-lg border border-zinc-800/50"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Handles */}
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-left-1.5" />
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-right-1.5" />
      </div>
    );
  }

  // Mobile Dimensions (iPhone 17 Pro Max / 16 Pro Max approx)
  const w = 430;
  const h = 932;

  return (
    // Container with padding for node separation
    <div className="group flex flex-col items-center justify-center p-12">
      {/* Inner wrapper for positioning relative to the phone */}
      <div className="relative">
        {/* Floating Controls Header - Full Width, Larger, Closer to phone */}
        <div className="absolute -top-24 left-0 w-full flex items-center justify-between px-6 py-4 bg-[#1e1e1e] border border-[#3e3e42] rounded-[32px] shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 z-50">
          <span className="text-gray-200 text-xl font-medium ml-2 truncate">{data.label}</span>
          <div className="flex gap-4 mr-2">
            <button 
              className="p-2 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded-full transition-colors"
              onClick={() => data.onShowCode?.(data.html)}
              title="Show Code"
            >
              <Code size={24} />
            </button>
            <button 
              className="p-2 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded-full transition-colors"
              onClick={() => data.onExpand?.(data.html)}
              title="Expand"
            >
              <Maximize2 size={24} />
            </button>
          </div>
        </div>

        {/* iPhone Frame */}
        <div 
          style={{ width: w, height: h }}
          className="relative bg-black rounded-[60px] shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] border-[12px] border-[#1a1a1a] ring-1 ring-[#333] overflow-hidden select-none flex flex-col"
        >
          {/* Hardware Buttons */}
          <div className="absolute top-[120px] -left-[16px] w-[4px] h-[26px] bg-[#2a2a2a] rounded-l-[2px]"></div> {/* Mute */}
          <div className="absolute top-[170px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div> {/* Vol Up */}
          <div className="absolute top-[240px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div> {/* Vol Down */}
          <div className="absolute top-[190px] -right-[16px] w-[4px] h-[80px] bg-[#2a2a2a] rounded-r-[2px]"></div> {/* Power */}

          {/* Status Bar */}
          <div className="w-full h-[54px] px-8 flex justify-between items-center pt-3 z-40 text-white pointer-events-none bg-black shrink-0">
             <span className="font-semibold text-[15px] tracking-wide">9:41</span>
             <div className="flex items-center gap-2">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" className="opacity-90">
                  <path d="M1 9C1 9.55 1.45 10 2 10H14C14.55 10 15 9.55 15 9V3C15 2.45 14.55 2 14 2H2C1.45 2 1 2.45 1 3V9ZM2 11C0.9 11 0 10.1 0 9V3C0 1.9 0.9 1 2 1H14C15.1 1 16 1.9 16 3V9C16 10.1 15.1 11 14 11H2ZM16.5 4.5V7.5C17.33 7.5 18 6.83 18 6C18 5.17 17.33 4.5 16.5 4.5Z" />
                  <rect x="2" y="3" width="11" height="6" rx="1" />
                </svg>
             </div>
          </div>

          {/* Screen Content */}
          {data.html ? (
            <iframe 
              srcDoc={data.html}
              className="flex-1 w-full border-none bg-[#09090b]"
              title={data.label}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="flex-1 w-full bg-[#09090b] animate-pulse p-5 pt-4 flex flex-col gap-4">
              {/* Mobile Header Skeleton */}
              <div className="h-10 bg-zinc-900 rounded-xl flex items-center px-4 border border-zinc-800/50">
                <div className="h-4 w-24 bg-zinc-800 rounded"></div>
              </div>
              
              {/* Hero Skeleton */}
              <div className="h-40 bg-zinc-900 rounded-2xl border border-zinc-800/50"></div>
              
              {/* Cards Skeleton */}
              <div className="flex gap-3">
                <div className="flex-1 h-24 bg-zinc-900 rounded-xl border border-zinc-800/50"></div>
                <div className="flex-1 h-24 bg-zinc-900 rounded-xl border border-zinc-800/50"></div>
              </div>
              
              {/* List Skeleton */}
              <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800/50 p-4 flex flex-col gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-12 bg-zinc-800/50 rounded-lg"></div>
                ))}
              </div>
              
              {/* Bottom Nav Skeleton */}
              <div className="h-16 bg-zinc-900 rounded-2xl border border-zinc-800/50 flex items-center justify-around px-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 bg-zinc-800 rounded-full"></div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Handles */}
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-left-1" />
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-right-1" />
      </div>
    </div>
  );
};

export default memo(PreviewNode);
