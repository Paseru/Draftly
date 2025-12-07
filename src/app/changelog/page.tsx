'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Format date to readable string
function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Process inline markdown (bold, code)
function processInlineMarkdown(text: string): string {
    // Handle bold (**text**)
    let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>');
    // Handle inline code (`code`)
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-blue-400 text-xs">$1</code>');
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
                <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1.5 text-sm text-zinc-300 mb-4 ml-4">
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
        // Headers
        if (line.startsWith('### ')) {
            flushList();
            elements.push(
                <h4 key={index} className="text-sm font-semibold text-zinc-100 mt-5 mb-2">
                    {line.slice(4)}
                </h4>
            );
        } else if (line.startsWith('## ')) {
            flushList();
            elements.push(
                <h3 key={index} className="text-base font-semibold text-white mt-5 mb-2">
                    {line.slice(3)}
                </h3>
            );
        } else if (line.startsWith('# ')) {
            flushList();
            elements.push(
                <h2 key={index} className="text-lg font-bold text-white mb-3">
                    {line.slice(2)}
                </h2>
            );
        }
        // List items
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            listItems.push(line.slice(2));
        }
        // Bold text and paragraphs
        else if (line.trim()) {
            flushList();
            // Handle bold (**text**) and inline code (`code`)
            let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>');
            processedLine = processedLine.replace(/`(.*?)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-blue-400 text-xs">$1</code>');
            elements.push(
                <p
                    key={index}
                    className="text-sm text-zinc-300 mb-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: processedLine }}
                />
            );
        }
    });

    flushList();
    return elements;
}

export default function ChangelogPage() {
    const changelogs = useQuery(api.changelog.getAllChangelogs);

    // Loading state
    if (changelogs === undefined) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center font-mono" style={{ backgroundColor: '#1e1e1e' }}>
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono p-6">
            {/* Header */}
            <div className="max-w-3xl mx-auto mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Link>
                    <div className="h-4 w-px bg-zinc-700" />
                    <h1 className="text-sm font-semibold text-zinc-100">Changelog</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto">
                {changelogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-sm font-medium text-zinc-100">No updates yet</h2>
                        <p className="text-xs text-zinc-500 text-center max-w-sm">
                            Check back soon for the latest updates and improvements.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {changelogs.map((changelog) => (
                            <article
                                key={changelog._id}
                                className="bg-[#252526] border border-[#3e3e42] rounded-xl p-5"
                            >
                                {/* Date */}
                                <time className="text-xs text-zinc-500 block mb-4">
                                    {formatDate(changelog.date)}
                                </time>

                                {/* Markdown content */}
                                <div className="prose prose-invert prose-sm max-w-none">
                                    {renderMarkdown(changelog.content)}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
