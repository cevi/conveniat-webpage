import { deriveMailHistory } from '@/features/payload-cms/payload-cms/components/outgoing-email/mail-history';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';

const TO = 'avp@ceviuster.ch';
const LIMIT =
  '554 5.7.0 Your message could not be sent. The limit on the number of allowed outgoing messages was exceeded.';

const accepted = (sentAt: string): SmtpResult => ({
  success: true,
  to: TO,
  sentAt,
  response: { accepted: [TO], rejected: [], response: '250 2.0.0 Ok: queued as 4dXk2B1Hq7z' },
});
const refused = (sentAt: string, error = LIMIT): SmtpResult => ({
  success: false,
  to: TO,
  sentAt,
  error,
});

describe('deriveMailHistory', () => {
  it('tells the attempts the mail server refused for its limit from the one it took, and how long the mail waited', () => {
    const history = deriveMailHistory(
      [
        refused('2026-11-16T09:40:00.000Z'),
        refused('2026-11-16T10:20:00.000Z'),
        accepted('2026-11-16T10:51:00.000Z'),
      ],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.attempts).toBe(3);
    expect(history.rateLimitedAttempts).toBe(2);
    expect(history.waitedMs).toBe(38 * 60 * 1000);
    expect(
      history.entries.map((entry) => (entry.kind === 'attempt' ? entry.outcome : entry.kind)),
    ).toEqual(['created', 'rateLimited', 'rateLimited', 'accepted']);
    expect(history.entries[1]).toMatchObject({ number: 1, waitedMs: 38 * 60 * 1000 });
  });

  it('does not call a send that left right away a wait', () => {
    const history = deriveMailHistory(
      [accepted('2026-11-16T09:02:04.000Z')],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.entries[1]).not.toHaveProperty('waitedMs');
    expect(history.waitedMs).toBe(4000);
  });

  it('keeps a refusal for anything else apart from the limit', () => {
    const history = deriveMailHistory(
      [refused('2026-11-16T09:40:00.000Z', '550 5.1.1 User unknown')],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.rateLimitedAttempts).toBe(0);
    expect(history.entries[1]).toMatchObject({ outcome: 'refused' });
  });

  it('counts a send that left suppressed recipients out once, and names them', () => {
    const history = deriveMailHistory(
      [
        {
          success: false,
          to: 'old@example.ch',
          error:
            'Not sent: old@example.ch bounced before and is on the list of suppressed addresses. Delete the entry there to send again.',
        },
        accepted('2026-11-16T09:02:04.000Z'),
      ],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.attempts).toBe(1);
    expect(history.entries[1]).toEqual({ kind: 'withheld', recipients: 'old@example.ch' });
  });

  it('reads a mail taken out of the queue as discarded, not as failed', () => {
    const history = deriveMailHistory(
      [{ success: false, to: TO, error: 'Not sent: a newer bill was sent' }],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.entries[1]).toMatchObject({ outcome: 'discarded' });
  });

  it('marks a resend, and shows an override once although it writes two rows', () => {
    const history = deriveMailHistory(
      [
        refused('2026-11-16T09:40:00.000Z', '421 Service not available'),
        {
          success: true,
          to: TO,
          retriggeredBy: 'admin',
          retriggeredAt: '2026-11-16T12:00:00.000Z',
          response: { response: '250 Ok' },
        },
        {
          success: false,
          to: TO,
          manualOverride: true,
          retriggeredAt: '2026-11-16T13:00:00.000Z',
          bounceReport: false,
        },
        {
          success: false,
          to: TO,
          manualOverride: true,
          retriggeredAt: '2026-11-16T13:00:00.000Z',
          bounceReport: true,
        },
      ],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.attempts).toBe(2);
    expect(history.entries.slice(1)).toEqual([
      expect.objectContaining({ kind: 'attempt', number: 1, isResend: false }),
      expect.objectContaining({
        kind: 'attempt',
        number: 2,
        isResend: true,
        at: '2026-11-16T12:00:00.000Z',
      }),
      { kind: 'override', success: false, at: '2026-11-16T13:00:00.000Z' },
    ]);
  });

  it('lists what a delivery report says about each recipient, at the time it was fetched', () => {
    const history = deriveMailHistory(
      [
        accepted('2026-11-16T09:02:04.000Z'),
        {
          success: true,
          to: TO,
          bounceReport: true,
          receivedAt: '2026-11-16T09:05:00.000Z',
          error: [
            'Reporting-MTA: dns; mail.cevi.tools',
            '',
            `Final-Recipient: rfc822; ${TO}`,
            'Action: relayed',
            'Status: 2.0.0',
            'Remote-MTA: dns; mx01.example.ch',
          ].join('\n'),
        },
      ],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.entries.at(-1)).toEqual({
      kind: 'report',
      action: 'relayed',
      at: '2026-11-16T09:05:00.000Z',
      server: 'mx01.example.ch',
      recipient: TO,
    });
    expect(history.attempts).toBe(1);
  });

  it('reads an override stored before overrides were flagged as one, not as a send', () => {
    const history = deriveMailHistory(
      [
        accepted('2026-11-16T09:02:04.000Z'),
        {
          success: false,
          to: TO,
          retriggeredBy: 'admin',
          retriggeredAt: '2026-11-16T13:00:00.000Z',
          response: { response: 'manually set to failed' },
        },
      ],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.attempts).toBe(1);
    expect(history.entries.at(-1)).toEqual({
      kind: 'override',
      success: false,
      at: '2026-11-16T13:00:00.000Z',
    });
  });

  it('reads a delivery report stored only as parsed fields', () => {
    const history = deriveMailHistory(
      [
        accepted('2026-11-16T09:02:04.000Z'),
        {
          success: false,
          to: TO,
          bounceReport: true,
          receivedAt: '2026-11-16T09:05:00.000Z',
          parsedDsn: { action: 'failed', finalRecipient: TO, remoteMta: 'mx01.example.ch' },
        },
      ],
      '2026-11-16T09:02:00.000Z',
    );

    expect(history.entries.at(-1)).toEqual({
      kind: 'report',
      action: 'failed',
      at: '2026-11-16T09:05:00.000Z',
      server: 'mx01.example.ch',
      recipient: TO,
    });
  });

  it('copes with a mail nobody has tried to send yet', () => {
    expect(deriveMailHistory(undefined, '2026-11-16T09:02:00.000Z')).toEqual({
      entries: [{ kind: 'created', at: '2026-11-16T09:02:00.000Z' }],
      attempts: 0,
      rateLimitedAttempts: 0,
    });
  });
});
