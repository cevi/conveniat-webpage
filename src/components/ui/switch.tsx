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
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-green-600' : 'bg-gray-200',
          className,
        )}
        {...properties}
      >
        <motion.span
          layout
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          animate={{
            x: checked ? 20 : 0,
          }}
          className={cn(
            'pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg ring-0',
          )}
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
        </motion.span>
      </button>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
