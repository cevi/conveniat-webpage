'use client';

import { cn } from '@/utils/tailwindcss-override';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

interface SwitchProperties extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  loading?: boolean;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProperties>(
  (
    { className, checked = false, onCheckedChange, disabled, loading, ...properties },
    reference,
  ) => {
    const handleClick = (): void => {
      if (!disabled && !loading && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || loading}
        onClick={handleClick}
        ref={reference}
        className={cn(
          // the track is 24px high, the hit area the 44px a thumb needs
          "peer site:focus-visible:ring-2 site:focus-visible:ring-gray-950 site:focus-visible:ring-offset-2 site:focus-visible:ring-offset-white site:focus-visible:outline-none relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] disabled:cursor-not-allowed disabled:opacity-50",
          !disabled && !loading && 'cursor-pointer',
          checked ? 'bg-conveniat-green' : 'bg-chip',
          className,
        )}
        {...properties}
      >
        <motion.span
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          animate={{
            x: checked ? '1.25rem' : '0rem',
          }}
          className={cn(
            'pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg ring-0',
          )}
        >
          {loading && (
            <Loader2 className="h-3 w-3 animate-spin text-green-500" aria-hidden="true" />
          )}
        </motion.span>
      </button>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
