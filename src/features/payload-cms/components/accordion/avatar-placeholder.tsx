import { User } from 'lucide-react';
import type React from 'react';

interface AvatarPlaceholderProperties {
  className?: string;
}

export const AvatarPlaceholder: React.FC<{
  className?: string;
}> = ({ className = 'h-full w-full' }: AvatarPlaceholderProperties) => {
  return (
    <div
      className={`${className} relative flex items-center justify-center overflow-hidden rounded-full bg-green-200 font-medium text-white`}
    >
      <User className="h-6 w-6" />
    </div>
  );
};
