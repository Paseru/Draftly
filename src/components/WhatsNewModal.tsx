'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Link from 'next/link';
import AiPaintbrush from '@/components/ui/AiPaintbrush';

const STORAGE_KEY = 'draftly_last_seen_changelog';

// Process inline markdown (bold, code)
function processInlineMarkdown(text: string): string {
    // Handle bold (**text**)
    let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>');
    // Handle inline code (`code`)
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-blue-400 text-[10px]">$1</code>');
    return processed;
}

// Simple markdown renderer for basic formatting
function renderMarkdown(content: string): React.ReactNode {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 text-[11px] text-zinc-400 mb-3">
                    {listItems.map((item, i) => (
                        <li
                            key={i}
                            dangerouslySetInnerHTML={{ __html: processInlineMarkdown(item) }}
                        />
                    ))}
                </ul>
            );
            listItems = [];
        }
    };

    lines.forEach((line, index) => {
        // Headers with emoji support
        if (line.startsWith('### ')) {
            flushList();
            elements.push(
                <h4 key={index} className="text-[11px] font-semibold text-zinc-200 mt-3 mb-1.5">
                    {line.slice(4)}
                </h4>
            );
        } else if (line.startsWith('## ')) {
            flushList();
            elements.push(
                <h3 key={index} className="text-xs font-semibold text-zinc-100 mt-3 mb-1.5">
                    {line.slice(3)}
                </h3>
            );
        } else if (line.startsWith('# ')) {
            flushList();
            // Skip the main title as it's redundant with header
        }
        // List items
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            listItems.push(line.slice(2));
        }
        // Paragraphs
        else if (line.trim()) {
            flushList();
            elements.push(
                <p
                    key={index}
                    className="text-[11px] text-zinc-400 mb-2"
                    dangerouslySetInnerHTML={{ __html: processInlineMarkdown(line) }}
                />
            );
        }
    });

    flushList();
    return elements;
}

export default function WhatsNewModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const latestChangelog = useQuery(api.changelog.getLatestChangelog);

    useEffect(() => {
        // Only check once and when we have the changelog data
        if (hasChecked || latestChangelog === undefined) return;

        setHasChecked(true);

        if (!latestChangelog) {
            // No changelog exists yet
            return;
        }

        // Check localStorage for last seen changelog
        const lastSeenId = localStorage.getItem(STORAGE_KEY);

        if (lastSeenId !== latestChangelog._id) {
            // New changelog available, show modal
            setIsOpen(true);
        }
    }, [latestChangelog, hasChecked]);

    const handleClose = () => {
        if (latestChangelog) {
            localStorage.setItem(STORAGE_KEY, latestChangelog._id);
        }
        setIsOpen(false);
    };

    const handleViewChangelog = () => {
        handleClose();
    };

    if (!latestChangelog) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md mx-4"
                    >
                        <div className="bg-[#1e1e1e] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-start justify-between p-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-center justify-center">
                                        <AiPaintbrush size={14} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">What&apos;s New</h3>
                                        <p className="text-xs text-zinc-400">
                                            {new Date(latestChangelog.date).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="px-4 pb-4 max-h-[50vh] overflow-y-auto">
                                {renderMarkdown(latestChangelog.content)}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-[#27272a] px-4 py-3 flex items-center justify-between gap-3">
                                <Link
                                    href="/changelog"
                                    onClick={handleViewChangelog}
                                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                                >
                                    View Full Changelog
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                                <button
                                    onClick={handleClose}
                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                                >
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
