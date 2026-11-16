/**
 * @jest-environment jsdom
 */
const mockHoldEndsAt = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/utils/email-outbox', () => ({
  outboxHoldEndsAt: (): unknown => mockHoldEndsAt(),
}));
const mockSentLastHour = jest.fn();
jest.mock('@/lib/background-email-budget', () => ({
  countBackgroundEmailsLastHour: (): unknown => mockSentLastHour(),
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { BACKGROUND_EMAIL_HOURLY_LIMIT: 40 },
}));

import EmailStatsWidget from '@/features/payload-cms/payload-cms/widgets/email-stats-widget';
import { render, screen } from '@testing-library/react';
import type { WidgetServerProps } from 'payload';

const counts: Record<string, number> = { success: 246, queued: 16, pending: 1, error: 28 };

const renderWidget = async (): Promise<void> => {
  const payload = {
    logger: { warn: jest.fn() },
    count: ({
      where,
    }: {
      where: { deliveryStatus: { equals: string } };
    }): Promise<{ totalDocs: number }> =>
      Promise.resolve({ totalDocs: counts[where.deliveryStatus.equals] ?? 0 }),
  };
  const element = await EmailStatsWidget({
    req: { payload, locale: 'de' },
  } as unknown as WidgetServerProps);
  render(element);
};

beforeEach(() => {
  // no hold
  mockHoldEndsAt.mockReturnValue(Promise.resolve());
  mockSentLastHour.mockResolvedValue(12);
});

describe('EmailStatsWidget', () => {
  it('shows the queue next to the sent and failed mails, with the hour used so far', async () => {
    await renderWidget();

    expect(screen.getByText('In Warteschlange').previousSibling?.textContent).toBe('16');
    expect(screen.getByText('Wird gesendet').previousSibling?.textContent).toBe('1');
    expect(
      screen.getByText('Warteschlange: 12 von 40 Mails in der letzten Stunde verschickt'),
    ).toBeTruthy();
  });

  it('says until when the queue is paused after the mail server refused for its limit', async () => {
    mockHoldEndsAt.mockResolvedValue(new Date('2026-11-16T10:35:00Z'));

    await renderWidget();

    expect(
      screen.getByText('Warteschlange pausiert bis 11:35: Der Mailserver hat sein Limit erreicht.'),
    ).toBeTruthy();
  });

  it('still shows the counts when the queue state cannot be read', async () => {
    mockSentLastHour.mockRejectedValue(new Error('redis down'));

    await renderWidget();

    expect(screen.getByText('Erfolgreich gesendet').previousSibling?.textContent).toBe('246');
    expect(screen.queryByText(/Warteschlange:/)).toBeNull();
  });
});
