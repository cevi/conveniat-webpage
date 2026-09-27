import { PersonAvatar } from '@/components/ui/person-avatar';
import type React from 'react';

/**
 * Initials avatar next to the last bubble of a sender block in a group chat. Other bubbles
 * of the block pass `hidden` and keep the space, so the block stays aligned.
 */
export const SenderAvatar: React.FC<{
  senderId: string;
  name: string;
  hidden?: boolean;
}> = ({ senderId, name, hidden = false }) =>
  hidden ? (
    <div aria-hidden="true" className="mb-1 h-7 w-7 shrink-0" />
  ) : (
    <PersonAvatar seed={senderId} name={name} className="font-body mb-1 h-7 w-7 text-[11px]" />
  );
