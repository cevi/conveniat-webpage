import { IconTile } from '@/components/ui/icon-tile';
import type { ForumTopicIcon } from '@/lib/forum-shared';
import {
  Bus,
  Calendar,
  Heart,
  Info,
  type LucideIcon,
  Map,
  MessageCircle,
  Shield,
  Star,
  Tent,
  Utensils,
  Wrench,
} from 'lucide-react';
import type React from 'react';

const ICONS: Record<ForumTopicIcon, LucideIcon> = {
  'message-circle': MessageCircle,
  tent: Tent,
  wrench: Wrench,
  utensils: Utensils,
  star: Star,
  calendar: Calendar,
  bus: Bus,
  heart: Heart,
  shield: Shield,
  info: Info,
  map: Map,
};

/** The tile of a topic, with the icon editors chose; a cache from before icons gets the bubble. */
export const ForumTopicIconView: React.FC<{ icon?: ForumTopicIcon | undefined }> = ({ icon }) => (
  <IconTile icon={ICONS[icon ?? 'message-circle']} />
);
