import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { MessageDto } from '@/features/chat/types/api-dto-types';
import { cn } from '@/utils/tailwindcss-override';
import React, { useEffect, useRef } from 'react';

/**
 * A dropdown component that displays message event timestamps.
 * (e.g., Sent, Delivered, Read)
 */
export const MessageInfoDropdown: React.FC<{
  message: MessageDto;
  isCurrentUser: boolean;
  onClose: () => void;
}> = ({ message, isCurrentUser, onClose }) => {
  const { formatMessageTime } = useFormatDate();
  const dropdownReference = useRef<HTMLDivElement>(null);

  // Effect to handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownReference.current && !dropdownReference.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // TODO: set correct dates based on message events
  const sentDate: Date = new Date(message.timestamp);
  const deliveredDate = new Date(message.timestamp) as Date | undefined;
  const readDate = new Date(message.timestamp) as Date | undefined;

  return (
    <div
      ref={dropdownReference}
      className={cn(
        'ring-opacity-5 absolute top-8 z-10 mt-1 w-56 rounded-lg bg-white p-3 shadow-xl ring-1 ring-black focus:outline-none',
        isCurrentUser ? 'right-0' : 'left-0',
      )}
      role="menu"
      aria-orientation="vertical"
    >
      <ul>
        <li className="flex justify-between py-1 text-sm text-gray-800">
          <span className="font-semibold">Sent</span>
          <span className="text-gray-600">{formatMessageTime(sentDate)}</span>
        </li>
        {deliveredDate !== undefined && (
          <li className="flex justify-between border-t border-gray-100 py-1 pt-2 text-sm text-gray-800">
            <span className="font-semibold">Delivered</span>
            <span className="text-gray-600">{formatMessageTime(deliveredDate)}</span>
          </li>
        )}
        {readDate !== undefined && (
          <li className="flex justify-between border-t border-gray-100 py-1 pt-2 text-sm text-gray-800">
            <span className="font-semibold">Read</span>
            <span className="text-gray-600">{formatMessageTime(readDate)}</span>
          </li>
        )}
      </ul>
    </div>
  );
};
