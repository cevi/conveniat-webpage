import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

interface ChatHeaderProperties {
  name: string;
}

export const ChatHeader: React.FC<ChatHeaderProperties> = ({ name }) => {
  return (
    <div className="flex items-center gap-2 border-b-2 border-gray-200 px-4 h-[62px] dark:border-gray-700">
      <Link href="/app/chat">
        <ArrowLeft className="h-5 w-5 mr-2" />
      </Link>
      <h1 className="text-xl font-semibold">{name}</h1>
    </div>
  );
};
