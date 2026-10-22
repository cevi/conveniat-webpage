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

  return (
    <div className="flex min-w-[200px] flex-col space-y-3 p-1">
      <p className="text-[15px] whitespace-pre-wrap text-green-900">{payload.message}</p>
      {/* red as the call button of the Notfall screens: this is the number to call in an emergency */}
      <a
        href={`tel:${payload.phoneNumber}`}
        className="bg-danger hover:bg-danger-text flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-white transition-colors"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        <span className="font-semibold">{payload.phoneNumber}</span>
      </a>
    </div>
  );
};
