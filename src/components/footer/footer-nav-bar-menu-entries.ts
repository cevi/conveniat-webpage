import type { Locale } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BriefcaseMedical,
  Calendar,
  CheckSquare,
  Compass,
  FileText,
  Flag,
  GlassWater,
  Heart,
  HelpCircle,
  House,
  Info,
  List,
  MapIcon,
  MapPin,
  MessageSquare,
  Phone,
  Radio,
  Recycle,
  Settings,
  Shield,
  Siren,
  Sparkles,
  Tent,
  Toilet,
  Users,
  Utensils,
} from 'lucide-react';

export interface AppNavBarItem {
  iconName: string;
  label: string;
  href: string;
  color?: string | undefined;
}

export type SerializableAppNavBarItem = AppNavBarItem;

export interface RawAppNavBarCmsItem {
  label: string;
  icon: string;
  href: string;
  color?: string | null;
}

export const APP_NAV_BAR_ICONS: Record<string, LucideIcon | undefined> = {
  MessageSquare,
  Siren,
  House,
  MapIcon,
  Calendar,
  Users,
  Settings,
  Info,
  Bell,
  Compass,
  MapPin,
  Tent,
  Utensils,
  Flag,
  HelpCircle,
  Phone,
  Shield,
  CheckSquare,
  List,
  BriefcaseMedical,
  Radio,
  Sparkles,
  Heart,
  FileText,
  GlassWater,
  Recycle,
  Toilet,
};

export const defaultFooterNavBarMenuEntries = [
  {
    iconName: 'MessageSquare',
    icon: MessageSquare,
    label: {
      de: 'Chats',
      en: 'Chats',
      fr: 'Chats',
    },
    href: '/app/chat',
  },
  {
    iconName: 'Siren',
    icon: Siren,
    label: {
      de: 'Notfall',
      en: 'Emergency',
      fr: 'Urgence',
    },
    href: '/app/emergency',
    color: 'red',
  },
  {
    iconName: 'House',
    icon: House,
    label: {
      de: 'Home',
      en: 'Home',
      fr: 'Accueil',
    },
    href: '/app/dashboard',
  },
  {
    iconName: 'MapIcon',
    icon: MapIcon,
    label: {
      de: 'Karte',
      en: 'Map',
      fr: 'Carte',
    },
    href: '/app/map',
  },
  {
    iconName: 'Calendar',
    icon: Calendar,
    label: {
      de: 'Programm',
      en: 'Program',
      fr: 'Programme',
    },
    href: '/app/schedule',
  },
];

export const footerNavBarMenuEntries = defaultFooterNavBarMenuEntries;

export function resolveAppNavBarEntries(
  cmsItems: (RawAppNavBarCmsItem | null)[] | null | undefined,
  locale: Locale,
): AppNavBarItem[] {
  if (Array.isArray(cmsItems) && cmsItems.length > 0) {
    const validItems: AppNavBarItem[] = [];
    for (const item of cmsItems) {
      if (!item) {
        continue;
      }
      const iconName =
        typeof item.icon === 'string' &&
        item.icon.length > 0 &&
        APP_NAV_BAR_ICONS[item.icon] !== undefined
          ? item.icon
          : 'House';

      const color =
        typeof item.color === 'string' && item.color.length > 0 && item.color !== 'default'
          ? item.color
          : undefined;

      validItems.push({
        iconName,
        label: typeof item.label === 'string' ? item.label : '',
        href: typeof item.href === 'string' ? item.href : '',
        color,
      });
    }

    if (validItems.length > 0) {
      return validItems;
    }
  }

  return defaultFooterNavBarMenuEntries.map((item) => ({
    iconName: item.iconName,
    label: item.label[locale],
    href: item.href,
    color: item.color,
  }));
}
