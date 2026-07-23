import { Calendar, House, MapIcon, MessageSquare, Siren } from 'lucide-react';

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
    icon: House,
    label: {
      de: 'Home',
      en: 'Home',
      fr: 'Accueil',
    },
    href: '/app/dashboard',
  },
  {
    icon: MapIcon,
    label: {
      de: 'Karte',
      en: 'Map',
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
