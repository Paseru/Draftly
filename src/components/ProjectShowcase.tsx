'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { X, Monitor, Smartphone } from 'lucide-react';
import { StreamingIframe } from './PreviewNode';
import HtmlPreview from './HtmlPreview';

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

export default function ProjectShowcase() {
    const publicProjects = useQuery(api.projects.getPublicProjects, { limit: 20 });
    const [previewProject, setPreviewProject] = useState<ProjectType | null>(null);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

    if (publicProjects === undefined) {
        return null;
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

    return (
        <>
            <section className="w-full -mt-16 pb-12">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {publicProjects.map((project) => {
                            const cardHtml = project.previewHtml || project.screens?.[0]?.html || '';
                            const hasHtml = cardHtml.trim().length > 0;
                            return (
                                <button
                                    key={project._id}
                                    onClick={(e) => handleCardClick(e, project as ProjectType)}
                                    className="group relative bg-[#252526] border border-[#3e3e42] rounded-xl overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 text-left cursor-pointer"
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
                </div>
            </section>

            {/* Preview Modal */}
            {previewProject && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200">
                    {/* Global close button */}
                    <button
                        onClick={closeModal}
                        className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer z-50"
                    >
                        <X size={24} />
                    </button>

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
                        </div>
                    ) : (
                        /* Desktop preview: 95% size, bottom aligned, centered */
                        <div
                            className="bg-[#1e1e1e] rounded-xl border border-[#3e3e42] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 absolute bottom-[2.5%] left-1/2 -translate-x-1/2"
                            style={{ height: 'calc((100vh - 80px) * 0.95)', width: '95%' }}
                        >
                            <div className="h-auto min-h-9 py-2 bg-[#252526] border-b border-[#3e3e42] flex items-center px-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex gap-1.5 shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                    </div>
                                    <span className="text-xs font-medium text-zinc-400">{previewLabel}</span>
                                </div>
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

                    {/* View mode toggle */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#252526]/90 backdrop-blur-md border border-[#3e3e42] p-1 rounded-full shadow-xl ring-1 ring-black/20">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'desktop' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                            title="Desktop View"
                        >
                            <Monitor size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'mobile' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                            title="Mobile View"
                        >
                            <Smartphone size={20} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
