import { Calendar, MapIcon, MessageSquare, Newspaper, Siren } from 'lucide-react';

export const footerNavBarMenuEntries = [
  {
    icon: MessageSquare,
    label: {
      de: 'Chats',
      en: 'Chats',
      fr: 'Chats',
    },
    href: '/app/chat',
  },
  {
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
    icon: Newspaper,
    label: {
      de: 'Webseite',
      en: 'Website',
      fr: 'Site web',
    },
    href: '/',
  },
  {
    icon: MapIcon,
    label: {
      de: 'Lagerplatz',
      en: 'Campsite',
      fr: 'Carte',
    },
    href: '/app/map',
  },
  {
    icon: Calendar,
    label: {
      de: 'Programm',
      en: 'Program',
      fr: 'Programme',
    },
    href: '/app/schedule',
  },
];
