'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import HtmlPreview from './HtmlPreview';

type ProjectType = {
    _id: string;
    title: string;
    screens: { id: string; name: string; html: string }[];
    previewHtml?: string;
    authorName?: string;
    createdAt: number;
};

type Props = {
    projects: ProjectType[];
    onCardClick: (e: React.MouseEvent, project: ProjectType) => void;
    onLoadMore: () => void;
    canLoadMore: boolean;
    isLoadingMore: boolean;
};

const COLUMNS = 4;
const ROW_HEIGHT = 200; // Card height with aspect-ratio 16/10 + content
const OVERSCAN = 2;

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

function ProjectCard({
    project,
    onClick
}: {
    project: ProjectType;
    onClick: (e: React.MouseEvent, project: ProjectType) => void;
}) {
    const cardHtml = project.previewHtml || project.screens?.[0]?.html || '';
    const hasHtml = cardHtml.trim().length > 0;

    return (
        <button
            onClick={(e) => onClick(e, project)}
            className="group relative bg-[#252526] border border-[#3e3e42] rounded-xl overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 text-left cursor-pointer w-full"
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
}

export default function VirtualizedProjectGrid({
    projects,
    onCardClick,
    onLoadMore,
    canLoadMore,
    isLoadingMore,
}: Props) {
    const parentRef = useRef<HTMLDivElement>(null);

    // Group projects into rows of COLUMNS
    const rows: ProjectType[][] = [];
    for (let i = 0; i < projects.length; i += COLUMNS) {
        rows.push(projects.slice(i, i + COLUMNS));
    }

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    const virtualRows = virtualizer.getVirtualItems();

    // Trigger load more when near bottom
    useEffect(() => {
        const lastRow = virtualRows[virtualRows.length - 1];
        if (!lastRow) return;

        // If we're within 3 rows of the end, load more
        if (lastRow.index >= rows.length - 3 && canLoadMore && !isLoadingMore) {
            onLoadMore();
        }
    }, [virtualRows, rows.length, canLoadMore, isLoadingMore, onLoadMore]);

    return (
        <div
            ref={parentRef}
            className="h-[600px] overflow-auto px-6"
            style={{ contain: 'strict' }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualRows.map((virtualRow) => {
                    const rowProjects = rows[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div className="grid grid-cols-4 gap-4 h-full pb-4">
                                {rowProjects.map((project) => (
                                    <ProjectCard
                                        key={project._id}
                                        project={project}
                                        onClick={onCardClick}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Loading indicator */}
            {isLoadingMore && (
                <div className="flex justify-center py-4">
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                        Loading more...
                    </div>
                </div>
            )}
        </div>
    );
}

export type { ProjectType };
