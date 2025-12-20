import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Type, Palette, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FontOption {
  id: string;
  name: string;
  googleFontName: string;
  category: string;
  reason: string;
}

export interface VibeOption {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  emoji: string;
}

export interface DesignSystemOptions {
  fonts: FontOption[];
  vibes: VibeOption[];
}

export interface DesignSystemSelection {
  font: FontOption;
  vibe: VibeOption;
}

interface Props {
  options: DesignSystemOptions;
  onSubmit?: (selection: DesignSystemSelection) => void;
  submittedSelection?: DesignSystemSelection | null;
  // Edit mode props
  onEdit?: () => void;
  isEditing?: boolean;
  onConfirmEdit?: (selection: DesignSystemSelection) => void;
  disabled?: boolean; // Disable editing (e.g., during generation)
}

export default function DesignSystemSelector({
  options,
  onSubmit,
  submittedSelection,
  onEdit,
  isEditing,
  onConfirmEdit,
  disabled
}: Props) {
  const [selectedFont, setSelectedFont] = useState<FontOption | null>(submittedSelection?.font || null);
  const [selectedVibe, setSelectedVibe] = useState<VibeOption | null>(submittedSelection?.vibe || null);
  const [isExpanded, setIsExpanded] = useState(!submittedSelection);
  const [isHovered, setIsHovered] = useState(false);

  // In edit mode, treat as not submitted so user can change selection
  const isSubmitted = !!submittedSelection && !isEditing;

  // Load Google Fonts dynamically
  useEffect(() => {
    if (!options.fonts.length) return;

    const fontsToLoad = options.fonts.map(f => f.googleFontName.replace(/ /g, '+'));

    if (fontsToLoad.length === 0) return;

    // Check if link already exists to avoid duplicates
    const existingLink = document.querySelector(`link[data-fonts="${fontsToLoad.join(',')}"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f}:wght@400;500;600;700`).join('&')}&display=swap`;
    link.rel = 'stylesheet';
    link.setAttribute('data-fonts', fontsToLoad.join(','));
    document.head.appendChild(link);

    // No cleanup - keep fonts loaded
  }, [options.fonts]);

  // Collapse when submitted (using useEffect with proper cleanup pattern)
  useEffect(() => {
    if (submittedSelection && !isEditing) {
      // Use requestAnimationFrame to defer the state update
      const rafId = requestAnimationFrame(() => {
        setIsExpanded(false);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [submittedSelection, isEditing]);

  // Expand when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setIsExpanded(true);
    }
  }, [isEditing]);



  const handleSubmit = () => {
    if (!onSubmit || !selectedFont || !selectedVibe) return;
    onSubmit({ font: selectedFont, vibe: selectedVibe });
  };

  const handleConfirmEditClick = () => {
    if (!onConfirmEdit || !selectedFont || !selectedVibe || !isEditing) return;
    onConfirmEdit({ font: selectedFont, vibe: selectedVibe });
  };

  const canSubmit = selectedFont && selectedVibe;

  return (
    <div
      className="w-full max-w-xl bg-[#1e1e1e] border border-[#27272a] rounded-xl overflow-hidden transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 transition-colors cursor-pointer hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          {isSubmitted || (submittedSelection && !isEditing) ? (
            <Palette size={14} className="text-orange-500" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          )}
          <span className={`text-xs font-medium tracking-wide ${isSubmitted || (submittedSelection && !isEditing) ? 'text-zinc-500' : 'text-white'}`}>
            Design System
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit button - always rendered to preserve space, visibility controlled by opacity */}
          {submittedSelection && !isEditing && onEdit && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={cn(
                "p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer",
                isHovered ? "opacity-100" : "opacity-0"
              )}
              title="Edit design system"
            >
              <Pencil size={12} />
            </button>
          )}
          <div className="text-zinc-500">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-y-auto custom-scrollbar",
          isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-3 pt-4 space-y-4 border-t border-[#27272a] bg-[#181818]">
          {/* Font Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Type size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Typography</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {options.fonts.map((font) => {
                const isSelected = selectedFont?.id === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => !isSubmitted && setSelectedFont(font)}
                    disabled={isSubmitted}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-left transition-all duration-200 border group",
                      isSelected
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-[#202023] border-[#27272a]",
                      !isSubmitted && !isSelected && "hover:bg-[#27272a] hover:border-zinc-600",
                      isSubmitted ? "cursor-default" : "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div
                          className={cn(
                            "text-[13px] font-medium transition-colors",
                            isSelected ? "text-blue-300" : "text-zinc-200 group-hover:text-white"
                          )}
                          style={{ fontFamily: `'${font.googleFontName}', sans-serif` }}
                        >
                          {font.name}
                        </div>
                        <div
                          className="text-[10px] text-zinc-500"
                          style={{ fontFamily: `'${font.googleFontName}', sans-serif` }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={14} className="text-blue-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vibe Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Palette size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Design Vibe</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {options.vibes.map((vibe) => {
                const isSelected = selectedVibe?.id === vibe.id;
                return (
                  <button
                    key={vibe.id}
                    onClick={() => !isSubmitted && setSelectedVibe(vibe)}
                    disabled={isSubmitted}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg text-left transition-all duration-200 border group",
                      isSelected
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-[#202023] border-[#27272a]",
                      !isSubmitted && !isSelected && "hover:bg-[#27272a] hover:border-zinc-600",
                      isSubmitted ? "cursor-default" : "cursor-pointer"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{vibe.emoji}</span>
                          <span className={cn(
                            "text-[12px] font-medium transition-colors",
                            isSelected ? "text-blue-300" : "text-zinc-200 group-hover:text-white"
                          )}>
                            {vibe.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 leading-relaxed">
                          {vibe.description}
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Auto option - Let Draftly choose (last) */}
              <button
                onClick={() => !isSubmitted && setSelectedVibe({
                  id: 'auto',
                  name: 'Let Draftly choose',
                  description: 'AI will pick the perfect vibe for your project',
                  keywords: [],
                  emoji: ''
                })}
                disabled={isSubmitted}
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg text-left transition-all duration-200 border group",
                  selectedVibe?.id === 'auto'
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-[#202023] border-[#27272a]",
                  !isSubmitted && selectedVibe?.id !== 'auto' && "hover:bg-[#27272a] hover:border-zinc-600",
                  isSubmitted ? "cursor-default" : "cursor-pointer"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[12px] font-medium transition-colors",
                        selectedVibe?.id === 'auto' ? "text-blue-300" : "text-zinc-200 group-hover:text-white"
                      )}>
                        Let Draftly choose
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500">Recommended for best results</div>
                  </div>
                  {selectedVibe?.id === 'auto' && (
                    <CheckCircle2 size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button - Outside scrollable area */}
      {!isSubmitted && isExpanded && (
        <div className="flex justify-end px-4 py-3 border-t border-[#27272a] bg-[#1e1e1e]">
          <button
            onClick={isEditing ? handleConfirmEditClick : handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "px-4 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-1.5",
              canSubmit
                ? "bg-zinc-100 hover:bg-white text-zinc-900 shadow-lg shadow-white/5 transform hover:-translate-y-0.5 cursor-pointer"
                : "bg-[#27272a] text-zinc-500 cursor-not-allowed border border-transparent"
            )}
          >
            {isEditing ? 'Confirm Edit' : 'Generate Plan'}
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
