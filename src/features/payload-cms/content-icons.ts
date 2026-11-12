import type { StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  Backpack,
  CalendarDays,
  Camera,
  CarFront,
  Check,
  Clock,
  Globe,
  Heart,
  Image as ImageIcon,
  Info,
  Mail,
  MapPin,
  Maximize2,
  Pencil,
  Phone,
  ShieldCheck,
  Tent,
  Ticket,
  TrainFront,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';

interface ContentIcon {
  /** what the CMS stores; never rename one, documents keep it */
  value: string;
  label: StaticTranslationString;
  icon: LucideIcon;
}

/**
 * The icons editors can put in front of a row, like a fact of the fact list or a step of the
 * image upload's introduction, by the value the CMS stores.
 */
export const CONTENT_ICONS = [
  { value: 'users', label: { de: 'Personen', en: 'People', fr: 'Personnes' }, icon: Users },
  {
    value: 'calendar',
    label: { de: 'Kalender', en: 'Calendar', fr: 'Calendrier' },
    icon: CalendarDays,
  },
  { value: 'clock', label: { de: 'Uhrzeit', en: 'Time', fr: 'Heure' }, icon: Clock },
  { value: 'mapPin', label: { de: 'Ort', en: 'Place', fr: 'Lieu' }, icon: MapPin },
  { value: 'train', label: { de: 'Zug / ÖV', en: 'Train', fr: 'Train / TP' }, icon: TrainFront },
  { value: 'car', label: { de: 'Auto', en: 'Car', fr: 'Voiture' }, icon: CarFront },
  { value: 'ticket', label: { de: 'Ticket', en: 'Ticket', fr: 'Billet' }, icon: Ticket },
  { value: 'wallet', label: { de: 'Kosten', en: 'Costs', fr: 'Coûts' }, icon: Wallet },
  { value: 'utensils', label: { de: 'Essen', en: 'Food', fr: 'Repas' }, icon: Utensils },
  { value: 'backpack', label: { de: 'Gepäck', en: 'Luggage', fr: 'Bagages' }, icon: Backpack },
  { value: 'tent', label: { de: 'Zelt', en: 'Tent', fr: 'Tente' }, icon: Tent },
  { value: 'mail', label: { de: 'E-Mail', en: 'Email', fr: 'E-mail' }, icon: Mail },
  { value: 'phone', label: { de: 'Telefon', en: 'Phone', fr: 'Téléphone' }, icon: Phone },
  { value: 'shield', label: { de: 'Sicherheit', en: 'Safety', fr: 'Sécurité' }, icon: ShieldCheck },
  { value: 'info', label: { de: 'Information', en: 'Information', fr: 'Information' }, icon: Info },
  { value: 'camera', label: { de: 'Kamera', en: 'Camera', fr: 'Appareil photo' }, icon: Camera },
  { value: 'image', label: { de: 'Bild', en: 'Image', fr: 'Image' }, icon: ImageIcon },
  { value: 'size', label: { de: 'Grösse', en: 'Size', fr: 'Taille' }, icon: Maximize2 },
  { value: 'pencil', label: { de: 'Schreiben', en: 'Writing', fr: 'Écrire' }, icon: Pencil },
  { value: 'check', label: { de: 'Häkchen', en: 'Check mark', fr: 'Coche' }, icon: Check },
  {
    value: 'globe',
    label: { de: 'Welt / Web', en: 'Globe / web', fr: 'Monde / web' },
    icon: Globe,
  },
  { value: 'heart', label: { de: 'Herz', en: 'Heart', fr: 'Cœur' }, icon: Heart },
] as const satisfies readonly ContentIcon[];

/** The choices of a `select` field that stores one of {@link CONTENT_ICONS}. */
export const contentIconOptions: { value: string; label: StaticTranslationString }[] =
  CONTENT_ICONS.map(({ value, label }) => ({ value, label }));

/**
 * The icon a stored value stands for. `undefined` for none and for a value no longer in the
 * catalogue, which a draft or an old document can hold.
 */
export const contentIconOf = (value: unknown): LucideIcon | undefined =>
  CONTENT_ICONS.find((candidate) => candidate.value === value)?.icon;
