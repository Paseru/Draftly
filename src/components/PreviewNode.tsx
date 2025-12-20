import { memo, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Maximize2, Code, Pencil } from 'lucide-react';

interface PreviewNodeProps {
  id: string;
  data: {
    label: string;
    html: string;
    onExpand?: (screenId: string) => void;
    onShowCode?: (html: string) => void;
    onFocus?: (screenId: string) => void;
    onOpenEditor?: (screenId: string) => void;
    viewMode?: 'desktop' | 'mobile';
    isGenerating?: boolean;
    isSelected?: boolean;
    hasPendingChanges?: boolean;
  };
}

// Streaming iframe component using document.write for smooth streaming updates
// Uses srcdoc for non-streaming (edit) mode to properly initialize Alpine.js
const StreamingIframe = memo(({ html, title, isGenerating }: { html: string; title: string; isGenerating?: boolean }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const writtenLengthRef = useRef(0);
  const writtenContentRef = useRef('');
  const isStreamOpenRef = useRef(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // NON-STREAMING MODE: Use srcdoc for proper Alpine.js initialization
    if (!isGenerating) {
      const isInitialLoad = !writtenContentRef.current && html;
      const isEditedContent = writtenContentRef.current && html !== writtenContentRef.current;

      if (isInitialLoad || isEditedContent) {
        writtenLengthRef.current = html.length;
        writtenContentRef.current = html;
        isStreamOpenRef.current = false;
        iframe.srcdoc = html;
        return;
      }
      return;
    }

    // STREAMING MODE: Use document.write for progressive rendering during generation
    const doc = iframe.contentDocument;
    if (!doc) return;

    const shouldReset = html.length < writtenLengthRef.current ||
      (writtenLengthRef.current === 0 && html.length > 0);

    if (shouldReset) {
      if (iframe.srcdoc) {
        iframe.removeAttribute('srcdoc');
      }
      doc.open();
      isStreamOpenRef.current = true;
      doc.write(html);
      writtenLengthRef.current = html.length;
      writtenContentRef.current = html;
    } else if (html.length > writtenLengthRef.current) {
      if (!isStreamOpenRef.current) {
        if (iframe.srcdoc) {
          iframe.removeAttribute('srcdoc');
        }
        doc.open();
        isStreamOpenRef.current = true;
        doc.write(html);
      } else {
        const chunk = html.slice(writtenLengthRef.current);
        doc.write(chunk);
      }
      writtenLengthRef.current = html.length;
      writtenContentRef.current = html;
    }
  }, [html, isGenerating]);

  return (
    <iframe
      ref={iframeRef}
      className="flex-1 w-full border-none bg-[#09090b]"
      title={title}
      sandbox="allow-scripts allow-same-origin"
    />
  );
});

StreamingIframe.displayName = 'StreamingIframe';

// Export for use in fullscreen modal
export { StreamingIframe };

const PreviewNode = ({ id, data }: PreviewNodeProps) => {
  const viewMode = data.viewMode || 'desktop';
  const isMobile = viewMode === 'mobile';

  // Desktop dimensions
  if (!isMobile) {
    const w = 1920;
    const h = 1080;

    return (
      <div className="group flex flex-col items-center justify-center p-12">
        <div className="relative">
          {/* Browser Frame */}
          <div
            style={{ width: w, height: h }}
            className={`relative flex flex-col bg-[#1e1e1e] rounded-lg border overflow-hidden shadow-2xl transition-all duration-300 cursor-pointer
              ${data.isSelected ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-[0_0_50px_-10px_rgba(59,130,246,0.2)]' : 'border-[#3e3e42]'}
            `}
            onClick={() => data.onFocus?.(id)}
          >
            {/* Simple header */}
            <div className="h-9 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-3 shrink-0 transition-colors duration-300 group-hover:bg-[#323238]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <span className="text-[#a1a1aa] text-xs ml-2">{data.label}</span>
                {data.hasPendingChanges && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                    Unsaved
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  className="p-1.5 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onShowCode?.(data.html);
                  }}
                >
                  <Code size={14} />
                </button>
                <button
                  className="p-1.5 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onExpand?.(id);
                  }}
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Content area */}
            {data.html ? (
              <StreamingIframe html={data.html} title={data.label} isGenerating={data.isGenerating} />
            ) : data.isGenerating ? (
              <div className="flex-1 bg-[#09090b] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="text-zinc-400 text-sm font-medium">Generating {data.label}</p>
                  <p className="text-zinc-600 text-xs mt-1">Creating your design...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-[#09090b] p-8 flex flex-col gap-6 opacity-40">
                <div className="w-full h-16 bg-zinc-900 rounded-lg flex items-center px-6 justify-between border border-zinc-800/50">
                  <div className="h-6 w-32 bg-zinc-800 rounded"></div>
                  <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-zinc-800"></div>
                    <div className="h-8 w-8 rounded-full bg-zinc-800"></div>
                  </div>
                </div>
                <div className="flex gap-6 flex-1">
                  <div className="w-64 h-full bg-zinc-900 rounded-lg border border-zinc-800/50 p-4 flex flex-col gap-3">
                    <div className="h-4 w-3/4 bg-zinc-800 rounded mb-4"></div>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-8 w-full bg-zinc-800/50 rounded"></div>
                    ))}
                  </div>
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

            {/* Hover Highlight Overlay */}
            <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500/0 group-hover:ring-blue-500/50 transition-all duration-300 pointer-events-none z-10" />
          </div>

          {/* Handles */}
          <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-left-1.5" />
          <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-right-1.5" />

          {/* Floating Edit Button - Desktop */}
          {!data.isGenerating && data.html && (
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenEditor?.(id);
                }}
                className="flex items-center gap-4 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3e3e42] hover:border-blue-500/50 text-zinc-300 hover:text-white px-7 py-3.5 rounded-full shadow-2xl transition-all duration-200 cursor-pointer"
              >
                <Pencil size={22} />
                <span className="text-base font-medium">Edit Screen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile Dimensions
  const w = 430;
  const h = 932;

  return (
    <div className="group flex flex-col items-center justify-center p-12">
      <div className="relative">
        {/* Floating Controls Header */}
        <div className="absolute -top-24 left-0 w-full flex items-center justify-between px-6 py-4 bg-[#1e1e1e] border border-[#3e3e42] rounded-[32px] shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 z-50">
          <div className="flex items-center gap-3">
            <span className="text-gray-200 text-xl font-medium ml-2 truncate">{data.label}</span>
            {data.hasPendingChanges && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                Unsaved
              </span>
            )}
          </div>
          <div className="flex gap-4 mr-2">
            <button
              className="p-2 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded-full transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                data.onShowCode?.(data.html);
              }}
              title="Show Code"
            >
              <Code size={24} />
            </button>
            <button
              className="p-2 text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded-full transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                data.onExpand?.(id);
              }}
              title="Expand"
            >
              <Maximize2 size={24} />
            </button>
          </div>
        </div>

        {/* iPhone Frame */}
        <div
          style={{ width: w, height: h }}
          className={`group relative bg-black rounded-[60px] shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] border-[12px] ring-1 overflow-hidden select-none flex flex-col transition-all duration-300 hover:bg-[#27272a] cursor-pointer
             ${data.isSelected ? 'border-blue-500 ring-blue-500/50 shadow-[0_0_100px_-10px_rgba(59,130,246,0.3)]' : 'border-[#1a1a1a] ring-[#333]'}
          `}
          onClick={() => data.onFocus?.(id)}
        >
          {/* Hardware Buttons */}
          <div className="absolute top-[120px] -left-[16px] w-[4px] h-[26px] bg-[#2a2a2a] rounded-l-[2px]"></div>
          <div className="absolute top-[170px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
          <div className="absolute top-[240px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
          <div className="absolute top-[190px] -right-[16px] w-[4px] h-[80px] bg-[#2a2a2a] rounded-r-[2px]"></div>

          {/* Status Bar */}
          <div className="w-full h-[54px] px-7 flex justify-between items-center z-40 text-white pointer-events-none bg-black shrink-0 relative">
             <span className="font-semibold text-[15px] tracking-wide pl-1">9:41</span>
             <div className="absolute left-1/2 -translate-x-1/2 top-[11px] w-[120px] h-[35px] bg-[#1a1a1a] rounded-[20px] z-50 flex items-center justify-center gap-5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] shadow-[inset_0_0_2px_1px_rgba(50,20,20,0.5)] opacity-80"></div>
                <div className="w-3 h-3 rounded-full bg-[#08081a] shadow-[inset_0_0_4px_2px_rgba(60,70,120,0.6)] ring-[0.5px] ring-white/5"></div>
             </div>
             <div className="flex items-center gap-2 pr-1">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" className="opacity-90">
                  <path d="M1 9C1 9.55 1.45 10 2 10H14C14.55 10 15 9.55 15 9V3C15 2.45 14.55 2 14 2H2C1.45 2 1 2.45 1 3V9ZM2 11C0.9 11 0 10.1 0 9V3C0 1.9 0.9 1 2 1H14C15.1 1 16 1.9 16 3V9C16 10.1 15.1 11 14 11H2ZM16.5 4.5V7.5C17.33 7.5 18 6.83 18 6C18 5.17 17.33 4.5 16.5 4.5Z" />
                  <rect x="2" y="3" width="11" height="6" rx="1" />
                </svg>
             </div>
          </div>

          {/* Screen Content */}
          {data.html ? (
            <StreamingIframe html={data.html} title={data.label} isGenerating={data.isGenerating} />
          ) : data.isGenerating ? (
            <div className="flex-1 w-full bg-[#09090b] flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-3 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <div className="text-center px-6">
                <p className="text-zinc-400 text-xs font-medium">Generating</p>
                <p className="text-zinc-500 text-[10px] mt-0.5">{data.label}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full bg-[#09090b] p-5 pt-4 flex flex-col gap-4 opacity-40">
              <div className="h-10 bg-zinc-900 rounded-xl flex items-center px-4 border border-zinc-800/50">
                <div className="h-4 w-24 bg-zinc-800 rounded"></div>
              </div>
              <div className="h-40 bg-zinc-900 rounded-2xl border border-zinc-800/50"></div>
              <div className="flex gap-3">
                <div className="flex-1 h-24 bg-zinc-900 rounded-xl border border-zinc-800/50"></div>
                <div className="flex-1 h-24 bg-zinc-900 rounded-xl border border-zinc-800/50"></div>
              </div>
              <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800/50 p-4 flex flex-col gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-12 bg-zinc-800/50 rounded-lg"></div>
                ))}
              </div>
              <div className="h-16 bg-zinc-900 rounded-2xl border border-zinc-800/50 flex items-center justify-around px-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 bg-zinc-800 rounded-full"></div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Hover Overlay */}
          <div className="absolute inset-0 rounded-[46px] pointer-events-none z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-blue-500/5 mix-blend-overlay" />
        </div>

        {/* Invisible Handles */}
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-left-1.5 opacity-0" />
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#1e1e1e] !-right-1.5 opacity-0" />

        {/* Floating Edit Button - Mobile */}
        {!data.isGenerating && data.html && (
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenEditor?.(id);
              }}
              className="flex items-center gap-4 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3e3e42] hover:border-blue-500/50 text-zinc-300 hover:text-white px-6 py-3 rounded-full shadow-2xl transition-all duration-200 cursor-pointer"
            >
              <Pencil size={19} />
              <span className="text-base font-medium">Edit</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(PreviewNode);
