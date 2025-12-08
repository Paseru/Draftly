'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Users, X } from 'lucide-react';

interface QueueWaitlistModalProps {
    isOpen: boolean;
    position: number;
    activeSlots?: number;
    maxSlots?: number;
    onCancel: () => void;
}

export default function QueueWaitlistModal({
    isOpen,
    position,
    activeSlots = 1,
    maxSlots = 1,
    onCancel
}: QueueWaitlistModalProps) {
    const [dots, setDots] = useState('');

    // Animated dots for "waiting" effect
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        return () => clearInterval(interval);
    }, [isOpen]);

    if (!isOpen) return null;

    // Estimate wait time: ~45 seconds per generation, divided by concurrent slots
    const estimatedWaitMinutes = Math.ceil((position * 45) / maxSlots / 60);
    const waitTimeText = estimatedWaitMinutes <= 1
        ? 'less than a minute'
        : `~${estimatedWaitMinutes} minutes`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-sm p-4 m-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-500/10 rounded-md">
                            <Users className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">You&apos;re in the Queue</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* Position indicator */}
                    <div className="flex items-center justify-center py-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 flex items-center justify-center">
                                <span className="text-3xl font-bold text-blue-400">#{position}</span>
                            </div>
                            {/* Animated ring */}
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"
                                style={{ animationDuration: '2s' }} />
                        </div>
                    </div>

                    <p className="text-xs text-zinc-400 text-center leading-relaxed">
                        Due to high demand, you are currently <span className="text-white font-medium">#{position}</span> in line.
                        Your generation will start automatically when it&apos;s your turn{dots}
                    </p>

                    {/* Wait time estimate */}
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                        <Clock size={12} />
                        <span>Estimated wait: {waitTimeText}</span>
                    </div>

                    {/* Capacity indicator */}
                    <div className="bg-[#161616] rounded-lg p-3 border border-[#27272a]">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-zinc-500">Server capacity</span>
                            <span className="text-zinc-400">{activeSlots}/{maxSlots} in use</span>
                        </div>
                        <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${(activeSlots / maxSlots) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Cancel button */}
                    <div className="pt-1 flex justify-end">
                        <button
                            onClick={onCancel}
                            className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-md hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
