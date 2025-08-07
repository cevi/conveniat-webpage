import { Button } from '@/components/ui/buttons/button';
import { cn } from '@/utils/tailwindcss-override';
import { Star } from 'lucide-react';
import type React from 'react';

export const StarButton: React.FC<{
  id: string;
  isStared: boolean;
  toggleStar: (id: string) => void;
}> = ({ id, isStared, toggleStar }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(event) => {
        event.stopPropagation();
        toggleStar(id);
      }}
      aria-label={isStared ? 'Remove from favorites' : 'Add to favorites'}
      className="h-8 w-8 hover:bg-gray-100"
    >
      <Star
        className={cn(
          'h-4 w-4 transition-all duration-200',
          isStared ? 'scale-110 fill-red-400 text-red-700' : 'text-gray-400 hover:scale-105',
        )}
      />
    </Button>
  );
};
