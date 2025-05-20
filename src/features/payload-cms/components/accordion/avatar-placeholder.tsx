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
      className={`${className} rounded-full bg-green-200 text-white flex items-center justify-center font-medium relative overflow-hidden`}
    >
      <User className="h-6 w-6" />
    </div>
  );
};
