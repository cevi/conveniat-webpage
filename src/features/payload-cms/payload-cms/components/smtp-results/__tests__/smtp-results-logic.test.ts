import { deriveSmtpItems } from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-logic';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';

const smtpAccepted: SmtpResult = {
  success: true,
  to: 'anna@example.ch, beat@example.ch',
  response: {
    accepted: ['anna@example.ch', 'beat@example.ch'],
    response: '250 2.0.0 Ok: queued as ABC123',
  },
};

const dsn = (to: string, action: string): SmtpResult => ({
  bounceReport: true,
  success: action !== 'failed',
  to,
  parsedDsn: { action, finalRecipient: to },
});

const stateOf = (items: SmtpResult[], recipient: string): boolean | undefined =>
  deriveSmtpItems(items).find((item) => item.bounceReport === true && item.to === recipient)
    ?.success;

describe('deriveSmtpItems', () => {
  it('shows a recipient as bounced when the relay report is stored after the bounce', () => {
    const items = [
      smtpAccepted,
      dsn('anna@example.ch', 'failed'),
      dsn('beat@example.ch', 'relayed'),
      dsn('anna@example.ch', 'relayed'),
    ];

    expect(stateOf(items, 'anna@example.ch')).toBe(false);
    expect(stateOf(items, 'beat@example.ch')).toBe(true);
  });

  it('shows a recipient as bounced when the bounce is stored after the relay report', () => {
    const items = [
      smtpAccepted,
      dsn('anna@example.ch', 'relayed'),
      dsn('anna@example.ch', 'failed'),
    ];

    expect(stateOf(items, 'anna@example.ch')).toBe(false);
  });

  it('shows a relayed recipient as successful while no other report has arrived', () => {
    const items = [smtpAccepted, dsn('anna@example.ch', 'relayed')];

    expect(stateOf(items, 'anna@example.ch')).toBe(true);
  });
});
