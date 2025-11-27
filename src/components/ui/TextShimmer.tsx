'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TextShimmerProps {
  children: string;
  className?: string;
  duration?: number;
}

export function TextShimmer({ children, className, duration = 2 }: TextShimmerProps) {
  return (
    <motion.span
      className={cn(
        'inline-block bg-clip-text text-transparent bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-[length:200%_100%]',
        className
      )}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}
