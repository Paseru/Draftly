'use client';

import React, { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface ShowcaseToggleBlockProps {
    projectId: Id<"projects">;
    initialIsPublic?: boolean;
}

export default function ShowcaseToggleBlock({ projectId, initialIsPublic = true }: ShowcaseToggleBlockProps) {
    const [isPublic, setIsPublic] = useState(initialIsPublic);
    const [isUpdating, setIsUpdating] = useState(false);
    const toggleVisibility = useMutation(api.projects.toggleProjectVisibility);

    const handleToggle = async () => {
        setIsUpdating(true);
        const newValue = !isPublic;
        try {
            await toggleVisibility({
                projectId,
                isPublic: newValue,
            });
            setIsPublic(newValue);
        } catch (error) {
            console.error('Failed to toggle visibility:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="bg-[#1e1e1e] rounded-xl border border-[#27272a] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <Globe size={14} className={isPublic ? 'text-blue-400' : 'text-zinc-500'} />
                    <span className="text-xs font-medium text-zinc-400">Show in Showcase</span>
                </div>
                <button
                    onClick={handleToggle}
                    disabled={isUpdating}
                    className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${isPublic ? 'bg-blue-500' : 'bg-zinc-700'
                        }`}
                >
                    {isUpdating ? (
                        <Loader2 size={10} className="absolute top-1 left-1 text-white animate-spin" />
                    ) : (
                        <div
                            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                        />
                    )}
                </button>
            </div>
        </div>
    );
}
