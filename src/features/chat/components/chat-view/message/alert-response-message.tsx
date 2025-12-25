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
        className="bg-conveniat-green hover:bg-conveniat-green-dark active:bg-conveniat-green-darker flex items-center justify-center space-x-2 rounded-md px-4 py-2 text-white transition-colors"
      >
        <Phone className="h-4 w-4" />
        <span className="font-semibold">{payload.phoneNumber}</span>
      </button>
    </div>
  );
};
