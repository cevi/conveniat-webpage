import { Button } from '@/components/ui/buttons/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

interface ChatHeaderProperties {
  name: string;
}

export const ChatHeader: React.FC<ChatHeaderProperties> = ({ name }) => {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 p-4 dark:border-gray-700">
      <Link href="/app/chat">
        <Button variant="ghost" size="icon" className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>
      <h1 className="text-xl font-semibold">{name}</h1>
    </div>
  );
};
