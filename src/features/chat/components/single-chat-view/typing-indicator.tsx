import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

interface TypingIndicatorProperties {
  userName: string | undefined;
}

export const TypingIndicator: React.FC<TypingIndicatorProperties> = ({ userName }) => {
  if (userName === undefined || userName === '') return <></>;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex space-x-1">
        <div
          className={cn('h-2 w-2 animate-bounce rounded-full bg-gray-400', 'animation-delay-0')}
        />
        <div
          className={cn('h-2 w-2 animate-bounce rounded-full bg-gray-400', 'animation-delay-150')}
        />
        <div
          className={cn('h-2 w-2 animate-bounce rounded-full bg-gray-400', 'animation-delay-300')}
        />
      </div>
      <span className="text-xs text-gray-500">{userName} is typing...</span>
    </div>
  );
};
