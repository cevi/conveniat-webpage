import type { MessagePreviewIcon as MessagePreviewIconName } from '@/features/chat/types/api-dto-types';
import type { LucideIcon } from 'lucide-react';
import { ImageIcon, MapPin, Siren } from 'lucide-react';
import type React from 'react';

/** Drawn in front of a preview that names a kind of message instead of quoting its text. */
const previewIcons: Record<MessagePreviewIconName, LucideIcon> = {
  image: ImageIcon,
  location: MapPin,
  emergency: Siren,
};

/**
 * The icon in front of a message preview, in the chat list and in a quote, if it has one. Read
 * defensively: the list may come from a persisted cache written by another version of the app.
 */
export const MessagePreviewIcon: React.FC<{ icon: unknown }> = ({ icon }) => {
  if (typeof icon !== 'string' || !Object.hasOwn(previewIcons, icon)) return <></>;
  const Icon = previewIcons[icon as MessagePreviewIconName];
  return <Icon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />;
};
