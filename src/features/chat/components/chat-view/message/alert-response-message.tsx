'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { Phone } from 'lucide-react';
import React from 'react';

interface AlertResponseMessageProperties {
  message: ChatMessage;
}

interface ResponsePayload {
  message: string;
  phoneNumber: string;
}

export const AlertResponseMessage: React.FC<AlertResponseMessageProperties> = ({ message }) => {
  const payload = message.messagePayload as unknown as ResponsePayload;

  const handleCall = (): void => {
    globalThis.location.href = `tel:${payload.phoneNumber}`;
  };

  return (
    <div className="flex min-w-[200px] flex-col space-y-3 p-1">
      <p className="whitespace-pre-wrap text-[var(--theme-text)]">{payload.message}</p>
      <button
        onClick={handleCall}
        className="bg-conveniat-green flex w-full cursor-pointer items-center justify-center space-x-2 rounded-xl px-4 py-3 text-white shadow-sm transition-all duration-200 hover:bg-green-700 hover:shadow-md active:scale-[0.98]"
      >
        <Phone className="h-4 w-4" />
        <span className="font-semibold">{payload.phoneNumber}</span>
      </button>
    </div>
  );
};
