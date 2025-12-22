import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { format } from 'date-fns';
import { de, enUS, fr } from 'date-fns/locale';
import { useCurrentLocale } from 'next-i18n-router/client';

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const getDateFnsLocale = (localeString: string): typeof enUS => {
  switch (localeString) {
    case 'de': {
      return de;
    }
    case 'fr': {
      return fr;
    }
    default: {
      return enUS;
    }
  }
};

export const useFormatDate = (): {
  formatMessageTime: (timestamp: Date) => string;
} => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const formatMessageTime = (timestamp: Date): string => {
    const dateFnsLocale = getDateFnsLocale(locale);

    // For messages from today, show just the time (e.g., "15:25")
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm', { locale: dateFnsLocale });
    }

    // For older messages, show the date and time
    return format(timestamp, 'MMM d, HH:mm', { locale: dateFnsLocale });
  };

  return { formatMessageTime };
};
