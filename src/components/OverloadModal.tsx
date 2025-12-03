import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface OverloadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function OverloadModal({ isOpen, onClose }: OverloadModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-sm p-4 m-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-500/10 rounded-md">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">System Overloaded</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-3">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Our systems are currently experiencing unusually high traffic. We apologize for the inconvenience.
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Please try your request again in a few moments.
                    </p>

                    <div className="pt-1 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-md hover:bg-zinc-200 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
