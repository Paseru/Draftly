'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, RotateCcw } from 'lucide-react';

interface StallWarningModalProps {
    isOpen: boolean;
    screenName: string;
    duration: number;
    onClose: () => void;
    onRetry: () => void;
}

export default function StallWarningModal({
    isOpen,
    screenName,
    duration,
    onClose,
    onRetry
}: StallWarningModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] max-w-lg w-full mx-4"
                >
                    <div className="bg-gradient-to-r from-amber-900/90 to-orange-900/90 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 p-5">
                        <div className="flex items-start gap-4">
                            {/* Warning Icon */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-amber-400" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Slow Generation Detected
                                </h3>
                                <p className="text-amber-100/80 text-sm leading-relaxed">
                                    Screen <span className="font-medium text-amber-300">&quot;{screenName}&quot;</span> hasn&apos;t received data for <span className="font-medium text-amber-300">{duration}s</span>.
                                    This may be due to AI server overload.
                                </p>

                                {/* Actions */}
                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        onClick={onRetry}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors text-sm"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Retry
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors text-sm"
                                    >
                                        Keep Waiting
                                    </button>
                                </div>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-amber-300/60 hover:text-amber-300" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
