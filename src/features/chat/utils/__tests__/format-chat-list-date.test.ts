import { formatChatListDate } from '@/features/chat/utils/format-chat-list-date';

const NOW = new Date(2027, 6, 28, 15, 0);

describe('formatChatListDate', () => {
  it('shows the time for a message of today', () => {
    expect(formatChatListDate(new Date(2027, 6, 28, 9, 5), 'de', NOW)).toBe('09:05');
  });

  it('shows the day and the month for this year', () => {
    expect(formatChatListDate(new Date(2027, 9, 12, 9, 5), 'de', NOW)).toBe('12. Okt.');
    expect(formatChatListDate(new Date(2027, 9, 12, 9, 5), 'fr', NOW)).toBe('12 oct.');
    expect(formatChatListDate(new Date(2027, 9, 12, 9, 5), 'en', NOW)).toBe('Oct 12');
  });

  it('adds the year for an older message', () => {
    expect(formatChatListDate(new Date(2026, 4, 21), 'de', NOW)).toBe('21.05.26');
  });

  it('shows nothing for a date it cannot read', () => {
    expect(formatChatListDate('not a date', 'de', NOW)).toBe('');
  });
});
