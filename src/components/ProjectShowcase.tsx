'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Monitor, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { StreamingIframe } from './PreviewNode';
import HtmlPreview from './HtmlPreview';
import { usePaginatedProjects } from '../hooks/usePaginatedProjects';

const INITIAL_DISPLAY_COUNT = 12; // 4x3 grid

// Hook to detect mobile viewport
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

type ProjectType = {
    _id: string;
    title: string;
    screens: { id: string; name: string; html: string }[];
    previewHtml?: string;
    authorName?: string;
    createdAt: number;
};

// Skeleton Card Component
function SkeletonCard() {
    return (
        <div className="relative bg-[#252526] border border-[#3e3e42] rounded-xl overflow-hidden">
            {/* Preview skeleton */}
            <div className="relative w-full aspect-[16/10] bg-[#1a1a1a] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] animate-shimmer" />
            </div>
            {/* Card content skeleton */}
            <div className="pt-3 px-3 pb-2">
                <div className="h-3 bg-[#3e3e42] rounded w-3/4 animate-pulse" />
                <div className="flex items-center justify-between mt-2">
                    <div className="h-2 bg-[#3e3e42] rounded w-16 animate-pulse" />
                    <div className="h-2 bg-[#3e3e42] rounded w-12 animate-pulse" />
                </div>
            </div>
        </div>
    );
}

// Skeleton Grid Component
function SkeletonGrid() {
    return (
        <section className="w-full -mt-16 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: INITIAL_DISPLAY_COUNT }).map((_, index) => (
                        <SkeletonCard key={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}

// Mobile Carousel Component - one preview at a time with arrow navigation
function MobileCarousel({ projects, onCardClick }: {
    projects: ProjectType[];
    onCardClick: (e: React.MouseEvent, project: ProjectType) => void;
}) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? projects.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === projects.length - 1 ? 0 : prev + 1));
    };

    const currentProject = projects[currentIndex];
    const cardHtml = currentProject?.previewHtml || currentProject?.screens?.[0]?.html || '';
    const hasHtml = cardHtml.trim().length > 0;

    return (
        <section className="w-full -mt-16 pb-12">
            <div className="max-w-7xl mx-auto px-4">
                {/* Single Preview Card */}
                <button
                    onClick={(e) => onCardClick(e, currentProject)}
                    className="w-full group relative bg-[#252526] border border-[#3e3e42] rounded-xl overflow-hidden transition-all hover:border-blue-500/30 text-left cursor-pointer"
                >
                    {/* Preview */}
                    <div className="relative w-full aspect-[16/10] bg-[#1a1a1a] overflow-hidden">
                        {hasHtml ? (
                            <HtmlPreview
                                html={cardHtml}
                                title={currentProject.title}
                                className="absolute inset-0"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                                No preview
                            </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                            <span className="text-xs text-white font-medium">Preview</span>
                        </div>
                    </div>

                    {/* Card content */}
                    <div className="pt-3 px-3 pb-2">
                        <h3 className="text-xs font-medium text-zinc-100 truncate">
                            {currentProject.title}
                        </h3>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-zinc-500">
                                {currentProject.authorName || 'Anonymous'}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                                {getRelativeTime(currentProject.createdAt)}
                            </span>
                        </div>
                    </div>
                </button>

                {/* Navigation Arrows */}
                <div className="flex items-center justify-center gap-6 mt-4">
                    <button
                        onClick={goToPrevious}
                        className="p-3 bg-[#252526] border border-[#3e3e42] rounded-full text-zinc-400 hover:text-white hover:border-zinc-500 transition-all cursor-pointer"
                        aria-label="Previous project"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {/* Counter */}
                    <span className="text-xs text-zinc-500">
                        {currentIndex + 1} / {projects.length}
                    </span>

                    <button
                        onClick={goToNext}
                        className="p-3 bg-[#252526] border border-[#3e3e42] rounded-full text-zinc-400 hover:text-white hover:border-zinc-500 transition-all cursor-pointer"
                        aria-label="Next project"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </section>
    );
}

export default function ProjectShowcase() {
    const {
        projects: publicProjects,
        isLoading,
        isLoadingMore,
        canLoadMore,
        loadMore,
    } = usePaginatedProjects();
    const [previewProject, setPreviewProject] = useState<ProjectType | null>(null);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [showAll, setShowAll] = useState(false);
    const isMobile = useIsMobile();

    // Ref for infinite scroll sentinel
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!showAll || !canLoadMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [showAll, canLoadMore, isLoadingMore, loadMore]);

    // Show skeleton loader while loading
    if (isLoading) {
        return <SkeletonGrid />;
    }

    if (publicProjects.length === 0) {
        return null;
    }

    const handleCardClick = (e: React.MouseEvent, project: ProjectType) => {
        e.preventDefault();
        setPreviewProject(project);
    };

    const closeModal = () => {
        setPreviewProject(null);
    };

    // Get first screen HTML for preview (prefer persisted previewHtml)
    const previewHtml = previewProject?.previewHtml || previewProject?.screens?.[0]?.html || '';
    const previewLabel = previewProject?.title || 'Preview';

    // Determine which projects to display (for non-virtualized initial view)
    const displayedProjects = publicProjects.slice(0, INITIAL_DISPLAY_COUNT);

    const hasMoreProjects = publicProjects.length >= INITIAL_DISPLAY_COUNT || canLoadMore;

    // Mobile: show carousel with one preview at a time
    if (isMobile) {
        return (
            <>
                <MobileCarousel
                    projects={publicProjects as ProjectType[]}
                    onCardClick={handleCardClick}
                />

                {/* Preview Modal - same as desktop */}
                {previewProject && (
                    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200">
                        {/* Close button */}
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer z-50"
                        >
                            <X size={24} />
                        </button>

                        {/* Mobile preview in phone frame */}
                        <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 scale-[0.65] transition-transform duration-300 origin-bottom">
                            <div
                                style={{ width: 430, height: 932 }}
                                className="relative bg-black rounded-[60px] shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] border-[12px] border-[#1a1a1a] ring-1 ring-[#333] overflow-hidden select-none flex flex-col"
                            >
                                <div className="absolute top-[120px] -left-[16px] w-[4px] h-[26px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                                <div className="absolute top-[170px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                                <div className="absolute top-[240px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                                <div className="absolute top-[190px] -right-[16px] w-[4px] h-[80px] bg-[#2a2a2a] rounded-r-[2px]"></div>

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

                                {previewHtml ? (
                                    <StreamingIframe
                                        html={previewHtml}
                                        title={previewLabel}
                                        isGenerating={false}
                                    />
                                ) : (
                                    <div className="flex-1 w-full bg-[#09090b] flex items-center justify-center">
                                        <span className="text-zinc-500 text-sm">No preview available</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Projects to display
    const projectsToShow = showAll ? publicProjects : displayedProjects;

    // Desktop: show grid with infinite scroll when expanded
    return (
        <>
            <section className="w-full -mt-16 pb-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {projectsToShow.map((project, index) => {
                            const cardHtml = project.previewHtml || project.screens?.[0]?.html || '';
                            const hasHtml = cardHtml.trim().length > 0;
                            const isNewlyRevealed = showAll && index >= INITIAL_DISPLAY_COUNT;

                            return (
                                <button
                                    key={project._id}
                                    onClick={(e) => handleCardClick(e, project as ProjectType)}
                                    className={`group relative bg-[#252526] border border-[#3e3e42] rounded-xl overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 text-left cursor-pointer ${isNewlyRevealed ? 'animate-fadeInUp' : ''}`}
                                    style={isNewlyRevealed ? {
                                        animationDelay: `${Math.min((index - INITIAL_DISPLAY_COUNT) * 50, 500)}ms`,
                                        animationFillMode: 'backwards'
                                    } : undefined}
                                >
                                    {/* Preview */}
                                    <div className="relative w-full aspect-[16/10] bg-[#1a1a1a] overflow-hidden">
                                        {hasHtml ? (
                                            <HtmlPreview
                                                html={cardHtml}
                                                title={project.title}
                                                className="absolute inset-0"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                                                No preview
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                            <span className="text-xs text-white font-medium">Preview</span>
                                        </div>
                                    </div>

                                    {/* Card content */}
                                    <div className="pt-3 px-3 pb-2">
                                        <h3 className="text-xs font-medium text-zinc-100 truncate">
                                            {project.title}
                                        </h3>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[10px] text-zinc-500">
                                                {project.authorName || 'Anonymous'}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">
                                                {getRelativeTime(project.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Show More Button - only when not expanded */}
                    {!showAll && hasMoreProjects && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setShowAll(true)}
                                className="px-5 py-2 bg-[#252526] border border-[#3e3e42] rounded-lg text-xs text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-[#2a2a2a] transition-all duration-300 cursor-pointer"
                            >
                                Show more
                            </button>
                        </div>
                    )}

                    {/* Infinite scroll sentinel & loading indicator */}
                    {showAll && (
                        <>
                            <div ref={loadMoreRef} className="h-4" />
                            {isLoadingMore && (
                                <div className="flex justify-center py-6">
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                                        Loading more...
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Preview Modal */}
            {previewProject && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200">
                    {/* Close button for mobile only (outside the phone frame) */}
                    {viewMode === 'mobile' && (
                        <button
                            onClick={closeModal}
                            className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer z-50"
                        >
                            <X size={24} />
                        </button>
                    )}

                    {viewMode === 'mobile' ? (
                        <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 scale-[0.75] sm:scale-[0.88] transition-transform duration-300 origin-bottom">
                            <div
                                style={{ width: 430, height: 932 }}
                                className="relative bg-black rounded-[60px] shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] border-[12px] border-[#1a1a1a] ring-1 ring-[#333] overflow-hidden select-none flex flex-col"
                            >
                                <div className="absolute top-[120px] -left-[16px] w-[4px] h-[26px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                                <div className="absolute top-[170px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                                <div className="absolute top-[240px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                                <div className="absolute top-[190px] -right-[16px] w-[4px] h-[80px] bg-[#2a2a2a] rounded-r-[2px]"></div>

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

                                {previewHtml ? (
                                    <StreamingIframe
                                        html={previewHtml}
                                        title={previewLabel}
                                        isGenerating={false}
                                    />
                                ) : (
                                    <div className="flex-1 w-full bg-[#09090b] flex items-center justify-center">
                                        <span className="text-zinc-500 text-sm">No preview available</span>
                                    </div>
                                )}
                            </div>

                            {/* View mode toggle for mobile - below the phone */}
                            <div className="flex justify-center mt-6">
                                <div className="flex items-center gap-1 bg-[#252526]/90 backdrop-blur-md border border-[#3e3e42] p-1 rounded-full shadow-xl ring-1 ring-black/20">
                                    <button
                                        onClick={() => setViewMode('desktop')}
                                        className="p-2 rounded-full transition-all cursor-pointer text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                        title="Desktop View"
                                    >
                                        <Monitor size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('mobile')}
                                        className="p-2 rounded-full transition-all cursor-pointer bg-blue-500/20 text-blue-400 shadow-sm"
                                        title="Mobile View"
                                    >
                                        <Smartphone size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Desktop preview: full size */
                        <div
                            className="bg-[#1e1e1e] w-full h-full rounded-xl border border-[#3e3e42] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10"
                        >
                            <div className="h-9 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-3 relative">
                                {/* Left: traffic lights + label */}
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5 shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                    </div>
                                    <span className="text-xs font-medium text-zinc-400">{previewLabel}</span>
                                </div>
                                {/* Center: View mode toggle */}
                                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1e1e1e] border border-[#3e3e42] p-0.5 rounded-full">
                                    <button
                                        onClick={() => setViewMode('desktop')}
                                        className="p-1.5 rounded-full transition-all cursor-pointer bg-blue-500/20 text-blue-400"
                                        title="Desktop View"
                                    >
                                        <Monitor size={14} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('mobile')}
                                        className="p-1.5 rounded-full transition-all cursor-pointer text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                        title="Mobile View"
                                    >
                                        <Smartphone size={14} />
                                    </button>
                                </div>
                                {/* Right: Close button */}
                                <button
                                    onClick={closeModal}
                                    className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-all cursor-pointer"
                                    title="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex-1 bg-[#09090b] overflow-hidden relative flex flex-col">
                                {previewHtml ? (
                                    <StreamingIframe
                                        html={previewHtml}
                                        title={previewLabel}
                                        isGenerating={false}
                                    />
                                ) : (
                                    <div className="flex-1 w-full h-full flex items-center justify-center">
                                        <span className="text-zinc-500 text-sm">No preview available</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
