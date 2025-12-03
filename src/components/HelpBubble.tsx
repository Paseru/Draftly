import React, { useState } from 'react';
import { HelpCircle, X, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const HelpBubble = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#252526]/90 backdrop-blur-md border border-[#3e3e42] p-4 rounded-2xl shadow-xl w-64 mb-2 ring-1 ring-black/20"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-semibold text-zinc-200">Need help?</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                            Have questions or feedback? Connect with me directly!
                        </p>

                        <div className="space-y-2">
                            <a
                                href="https://x.com/RayaneRachid_"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#3e3e42] border border-[#3e3e42] transition-all group cursor-pointer"
                            >
                                <span className="text-xs text-zinc-300 group-hover:text-white">Twitter / X</span>
                                <ExternalLink size={12} className="text-zinc-500 group-hover:text-zinc-300" />
                            </a>

                            <a
                                href="https://www.linkedin.com/in/rayane-rachid-a47514275/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#3e3e42] border border-[#3e3e42] transition-all group cursor-pointer"
                            >
                                <span className="text-xs text-zinc-300 group-hover:text-white">LinkedIn</span>
                                <ExternalLink size={12} className="text-zinc-500 group-hover:text-zinc-300" />
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2.5 rounded-full transition-all cursor-pointer shadow-lg ring-1 ring-black/20
          ${isOpen
                        ? 'bg-blue-500 text-white rotate-90'
                        : 'bg-[#252526]/90 backdrop-blur-md border border-[#3e3e42] text-zinc-400 hover:text-white hover:bg-[#3e3e42]'
                    }`}
                title="Help & Feedback"
            >
                {isOpen ? <X size={22} /> : <HelpCircle size={22} />}
            </button>
        </div>
    );
};

export default HelpBubble;
