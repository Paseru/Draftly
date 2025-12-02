import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Type, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FontOption {
  id: string;
  name: string;
  googleFontName: string;
  category: string;
  reason: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  reason: string;
}

export interface DesignSystemOptions {
  fonts: FontOption[];
  palettes: ColorPalette[];
}

export interface DesignSystemSelection {
  font: FontOption;
  palette: ColorPalette;
}

interface Props {
  options: DesignSystemOptions;
  onSubmit?: (selection: DesignSystemSelection) => void;
  submittedSelection?: DesignSystemSelection | null;
}

export default function DesignSystemSelector({ options, onSubmit, submittedSelection }: Props) {
  const [selectedFont, setSelectedFont] = useState<FontOption | null>(submittedSelection?.font || null);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(submittedSelection?.palette || null);
  const [isExpanded, setIsExpanded] = useState(!submittedSelection);
  const [fontsLoaded, setFontsLoaded] = useState<Set<string>>(new Set());

  const isSubmitted = !!submittedSelection;

  // Load Google Fonts dynamically
  useEffect(() => {
    if (!options.fonts.length) return;

    const fontsToLoad = options.fonts
      .filter(f => !fontsLoaded.has(f.googleFontName))
      .map(f => f.googleFontName.replace(/ /g, '+'));

    if (fontsToLoad.length === 0) return;

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f}:wght@400;500;600;700`).join('&')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    link.onload = () => {
      setFontsLoaded(prev => {
        const newSet = new Set(prev);
        options.fonts.forEach(f => newSet.add(f.googleFontName));
        return newSet;
      });
    };

    return () => {
      document.head.removeChild(link);
    };
  }, [options.fonts, fontsLoaded]);



  const handleSubmit = () => {
    if (!onSubmit || !selectedFont || !selectedPalette) return;
    onSubmit({ font: selectedFont, palette: selectedPalette });
  };

  const canSubmit = selectedFont && selectedPalette;

  return (
    <div className="w-full max-w-xl bg-[#1e1e1e] border border-[#27272a] rounded-xl overflow-hidden transition-all duration-200">
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="flex items-center justify-between px-4 py-3 transition-colors cursor-pointer hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          {isSubmitted ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className={`text-xs font-medium tracking-wide ${isSubmitted ? 'text-zinc-500' : 'text-white'}`}>
            Design System
          </span>
        </div>
        <div className="text-zinc-500">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      <div 
        className={cn(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-4 pt-2 space-y-6">
          {/* Font Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <Type size={14} />
              <span className="text-[11px] font-medium uppercase tracking-wider">Typography</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {options.fonts.map((font) => {
                const isSelected = selectedFont?.id === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => !isSubmitted && setSelectedFont(font)}
                    disabled={isSubmitted}
                    className={cn(
                      "w-full px-4 py-3 rounded-lg text-left transition-all duration-200 border group",
                      isSelected 
                        ? "bg-emerald-500/10 border-emerald-500/40" 
                        : "bg-[#202023] border-[#27272a]",
                      !isSubmitted && !isSelected && "hover:bg-[#27272a] hover:border-zinc-600",
                      isSubmitted && "cursor-default"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1.5">
                        <div 
                          className={cn(
                            "text-lg font-semibold transition-colors",
                            isSelected ? "text-emerald-300" : "text-zinc-200 group-hover:text-white"
                          )}
                          style={{ fontFamily: `'${font.googleFontName}', sans-serif` }}
                        >
                          {font.name}
                        </div>
                        <div 
                          className="text-[11px] text-zinc-500"
                          style={{ fontFamily: `'${font.googleFontName}', sans-serif` }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </div>
                      </div>
                      <div className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
                        isSelected 
                          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          : "text-zinc-600 border-zinc-700"
                      )}>
                        {font.category}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Palette Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <Palette size={14} />
              <span className="text-[11px] font-medium uppercase tracking-wider">Color Palette</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {options.palettes.map((palette) => {
                const isSelected = selectedPalette?.id === palette.id;
                return (
                  <button
                    key={palette.id}
                    onClick={() => !isSubmitted && setSelectedPalette(palette)}
                    disabled={isSubmitted}
                    className={cn(
                      "w-full px-4 py-3 rounded-lg text-left transition-all duration-200 border group",
                      isSelected 
                        ? "bg-emerald-500/10 border-emerald-500/40" 
                        : "bg-[#202023] border-[#27272a]",
                      !isSubmitted && !isSelected && "hover:bg-[#27272a] hover:border-zinc-600",
                      isSubmitted && "cursor-default"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className={cn(
                          "text-[13px] font-medium transition-colors",
                          isSelected ? "text-emerald-300" : "text-zinc-200 group-hover:text-white"
                        )}>
                          {palette.name}
                        </div>
                        
                        {/* Color swatches */}
                        <div className="flex items-center gap-1">
                          <div 
                            className="w-8 h-8 rounded-md ring-1 ring-white/10 shadow-inner"
                            style={{ backgroundColor: palette.colors.primary }}
                            title="Primary"
                          />
                          <div 
                            className="w-8 h-8 rounded-md ring-1 ring-white/10 shadow-inner"
                            style={{ backgroundColor: palette.colors.secondary }}
                            title="Secondary"
                          />
                          <div 
                            className="w-8 h-8 rounded-md ring-1 ring-white/10 shadow-inner"
                            style={{ backgroundColor: palette.colors.accent }}
                            title="Accent"
                          />
                          <div 
                            className="w-6 h-6 rounded ring-1 ring-white/10 shadow-inner"
                            style={{ backgroundColor: palette.colors.background }}
                            title="Background"
                          />
                          <div 
                            className="w-6 h-6 rounded ring-1 ring-white/10 shadow-inner"
                            style={{ backgroundColor: palette.colors.text }}
                            title="Text"
                          />
                        </div>
                      </div>
                      
                      {isSelected && (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          {!isSubmitted && (
            <div className="flex justify-end pt-2 border-t border-[#27272a]">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "px-4 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-1.5",
                  canSubmit 
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5 cursor-pointer" 
                    : "bg-[#27272a] text-zinc-500 cursor-not-allowed border border-transparent"
                )}
              >
                Continue with Design
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
