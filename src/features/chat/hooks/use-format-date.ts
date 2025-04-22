import { format, formatDistanceToNow } from 'date-fns';

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const formatMessageTime = (timestamp: Date): string => {
  // For messages from today, show relative time
  if (isToday(timestamp)) {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  }

  // For older messages, show the date
  return format(timestamp, 'MMM d, yyyy');
};

export const useFormatDate = (): {
  formatMessageTime: (timestamp: Date) => string;
} => ({ formatMessageTime });
