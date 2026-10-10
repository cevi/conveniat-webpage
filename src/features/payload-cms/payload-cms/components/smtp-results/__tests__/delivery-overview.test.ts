import type { RecipientState } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import {
  deriveDeliveryOverview,
  parseDeliveryReport,
} from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';

const SYSTEM = 'noreply@cevi.tools';
const OPTIONS = { systemEmails: [SYSTEM], createdAt: '2026-10-05T05:10:01.000Z' };

const accepted = (recipients: string[], queueId = 'ABC123'): SmtpResult => ({
  success: true,
  to: recipients.join(', '),
  response: {
    accepted: recipients,
    rejected: [],
    response: `250 2.0.0 Ok: queued as ${queueId}`,
    envelope: { from: SYSTEM, to: recipients },
  },
});

/** A report as the bounce job stores it: the subject, then the text part of the mail. */
const report = (
  recipientBlocks: string[],
  { server = 'mail.example.net', queueId = 'ABC123' } = {},
): string =>
  [
    'Delivery Status Notification. Subject: Delivery report.',
    '',
    'Reason:',
    'This is the mail system.',
    '',
    `Reporting-MTA: dns; ${server}`,
    `X-Postfix-Queue-ID: ${queueId}`,
    'Arrival-Date: Mon,  5 Oct 2026 07:10:01 +0200 (CEST)',
    '',
    recipientBlocks.join('\n\n'),
  ].join('\n');

const postfixBlock = (recipient: string, action: string, remote: string, answer: string): string =>
  [
    `Final-Recipient: rfc822; ${recipient}`,
    `Original-Recipient: rfc822;${SYSTEM}`,
    `Action: ${action}`,
    `Status: ${answer.startsWith('5') ? '5.0.0' : '2.0.0'}`,
    `Remote-MTA: dns; ${remote}`,
    `Diagnostic-Code: smtp; ${answer}`,
  ].join('\n');

/** The bounce job stores a report once per recipient line, under whatever address it read. */
const stored = (text: string, to: string, success = true): SmtpResult => ({
  bounceReport: true,
  receivedAt: '2026-10-05T05:15:02.000Z',
  success,
  to,
  ...(success ? { response: { response: text } } : { error: text }),
});

const statesOf = (
  results: SmtpResult[],
  options: Parameters<typeof deriveDeliveryOverview>[1] = OPTIONS,
): Record<string, RecipientState> =>
  Object.fromEntries(
    deriveDeliveryOverview(results, options).current.recipients.map((recipient) => [
      recipient.address,
      recipient.state,
    ]),
  );

const delayedAt = (date: string): SmtpResult =>
  stored(
    report([postfixBlock('anna@example.ch', 'delayed', 'example.ch', '451 try later')]).replace(
      'Mon,  5 Oct 2026 07:10:01',
      date,
    ),
    'anna@example.ch',
    false,
  );

describe('parseDeliveryReport', () => {
  it('reads every recipient of a report, with the server that answered for each', () => {
    const blocks = parseDeliveryReport(
      report([
        postfixBlock('anna@example.ch', 'relayed', 'relay.example.net', '250 2.0.0 Ok'),
        postfixBlock('beat@example.ch', 'failed', 'mx.example.ch (192.0.2.7)', '550 no such user'),
      ]),
    );

    expect(blocks.map((block) => [block.finalRecipient, block.event.action])).toEqual([
      ['anna@example.ch', 'relayed'],
      ['beat@example.ch', 'failed'],
    ]);
    expect(blocks[1]?.event).toMatchObject({
      server: 'mx.example.ch',
      status: '5.0.0',
      diagnostic: '550 no such user',
      at: '2026-10-05T05:10:01.000Z',
    });
  });

  it('reads a recipient whose fields come in another order, and a folded answer', () => {
    const blocks = parseDeliveryReport(
      report([
        [
          `Original-Recipient: rfc822;${SYSTEM}`,
          'Action: delivered',
          'Final-Recipient: RFC822; <carla@example.ch>',
          'Status: 2.0.0',
          'Diagnostic-Code: X-Exim; relayed via',
          '    non SMTP router',
        ].join('\n'),
      ]),
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      finalRecipient: 'carla@example.ch',
      event: { action: 'delivered', diagnostic: 'relayed via non SMTP router' },
    });
  });

  it('finds no recipient in a mail that is not a delivery report', () => {
    expect(parseDeliveryReport("Subject: You've received a new message.\n\nHello")).toEqual([]);
  });
});

describe('deriveDeliveryOverview', () => {
  const recipients = ['anna@example.ch', 'beat@example.ch', 'carla@example.ch'];

  it('shows each recipient once when one report was stored for every line it contains', () => {
    const relayed = report(
      recipients.map((recipient) =>
        postfixBlock(recipient, 'relayed', 'relay.example.net', '250 2.0.0 Ok'),
      ),
    );
    const bounce = report([
      postfixBlock('anna@example.ch', 'failed', 'example.ch', '550 detected as spam'),
    ]);

    const overview = deriveDeliveryOverview(
      [
        accepted(recipients),
        stored(bounce, 'anna@example.ch', false),
        ...recipients.flatMap((recipient) => [stored(relayed, recipient), stored(relayed, SYSTEM)]),
        stored(relayed, SYSTEM),
      ],
      OPTIONS,
    );

    expect(overview.reportCount).toBe(2);
    expect(overview.current.recipients.map((recipient) => recipient.address)).toEqual(recipients);
    expect(overview.current.recipients.map((recipient) => recipient.state)).toEqual([
      'failed',
      'relayed',
      'relayed',
    ]);
    expect(overview.current.recipients[0]?.events.map((event) => event.action)).toEqual([
      'relayed',
      'failed',
    ]);
  });

  it('keeps a bounce although the hand-off report was stored after it', () => {
    const bounce = stored(
      report([postfixBlock('anna@example.ch', 'failed', 'example.ch', '550 no such user')]),
      'anna@example.ch',
      false,
    );
    const relayed = stored(
      report([postfixBlock('anna@example.ch', 'relayed', 'relay.example.net', '250 Ok')]),
      'anna@example.ch',
    );

    expect(statesOf([accepted(['anna@example.ch']), bounce, relayed])).toEqual({
      'anna@example.ch': 'failed',
    });
    expect(statesOf([accepted(['anna@example.ch']), relayed, bounce])).toEqual({
      'anna@example.ch': 'failed',
    });
  });

  it('gives a report that names only our sender address to the single recipient', () => {
    const anonymous = report([
      [
        `Original-Recipient: rfc822;${SYSTEM}`,
        `Final-Recipient: rfc822;${SYSTEM}`,
        'Action: delivered',
        'Status: 2.0.0',
      ].join('\n'),
    ]);

    expect(statesOf([accepted(['anna@example.ch']), stored(anonymous, SYSTEM)])).toEqual({
      'anna@example.ch': 'delivered',
    });
  });

  it('gives such reports to the recipients nobody else reported on, when the numbers match', () => {
    const anonymous = (server: string): string =>
      report([`Final-Recipient: rfc822;${SYSTEM}\nAction: delivered\nStatus: 2.0.0`], { server });
    const relayed = report([
      postfixBlock('anna@example.ch', 'relayed', 'relay.example.net', '250 Ok'),
    ]);
    const results = [
      accepted(recipients),
      stored(relayed, 'anna@example.ch'),
      stored(anonymous('one.example.net'), SYSTEM),
    ];

    const ambiguous = deriveDeliveryOverview(results, OPTIONS);
    expect(ambiguous.current.unassigned).toHaveLength(1);
    expect(statesOf(results)).toEqual({
      'anna@example.ch': 'relayed',
      'beat@example.ch': 'noReport',
      'carla@example.ch': 'noReport',
    });

    expect(statesOf([...results, stored(anonymous('two.example.net'), SYSTEM)])).toEqual({
      'anna@example.ch': 'relayed',
      'beat@example.ch': 'delivered',
      'carla@example.ch': 'delivered',
    });
  });

  it('lists the members a distribution list delivered to, below the list itself', () => {
    const member = (address: string): string =>
      report([
        `Original-Recipient: rfc822;${address}\nFinal-Recipient: rfc822;${address}\nAction: delivered\nStatus: 2.0.0`,
      ]);
    const forwarded = report([
      'Original-Recipient: rfc822;team@example.ch\nFinal-Recipient: rfc822;dora@example.org\nAction: relayed\nStatus: 2.0.0',
    ]);

    const { current } = deriveDeliveryOverview(
      [
        accepted(['team@example.ch']),
        stored(member('emil@example.ch'), 'emil@example.ch'),
        stored(forwarded, 'dora@example.org'),
      ],
      { ...OPTIONS, now: Date.parse('2026-10-20T00:00:00.000Z') },
    );

    expect(
      current.recipients.map(({ address, expected, state, via }) => ({
        address,
        expected,
        state,
        via,
      })),
    ).toEqual([
      // Not overdue: the members explain why the list never reported for itself.
      { address: 'team@example.ch', expected: true, state: 'noReport', via: undefined },
      { address: 'emil@example.ch', expected: false, state: 'delivered', via: undefined },
      { address: 'dora@example.org', expected: false, state: 'relayed', via: 'team@example.ch' },
    ]);
  });

  it('marks a recipient overdue when no server reported within two days', () => {
    const results = [accepted(['anna@example.ch'])];

    expect(statesOf(results, { ...OPTIONS, now: Date.parse('2026-10-06T00:00:00.000Z') })).toEqual({
      'anna@example.ch': 'noReport',
    });
    expect(statesOf(results, { ...OPTIONS, now: Date.parse('2026-10-08T00:00:00.000Z') })).toEqual({
      'anna@example.ch': 'overdue',
    });
  });

  it('shows the error of a mail our server never accepted, even without a usable address', () => {
    const { current } = deriveDeliveryOverview(
      [{ success: false, to: 'email', error: 'No recipients defined' }],
      OPTIONS,
    );

    expect(current.recipients).toEqual([
      expect.objectContaining({
        address: 'email',
        state: 'notSent',
        submission: { accepted: false, detail: 'No recipients defined' },
      }),
    ]);
  });

  it('shows the resend and keeps the failed first attempt apart', () => {
    const overview = deriveDeliveryOverview(
      [
        { success: false, to: '"Anna" <anna@example.ch>', error: 'Connection timeout' },
        {
          ...accepted(['anna@example.ch'], 'SECOND1'),
          retriggeredBy: 'user-1',
          retriggeredAt: '2026-10-06T08:00:00.000Z',
        },
        stored(
          report([postfixBlock('anna@example.ch', 'relayed', 'relay.example.net', '250 Ok')], {
            queueId: 'SECOND1',
          }),
          'anna@example.ch',
        ),
      ],
      OPTIONS,
    );

    expect(overview.earlier.map((attempt) => attempt.recipients[0]?.state)).toEqual(['notSent']);
    expect(overview.current.startedAt).toBe('2026-10-06T08:00:00.000Z');
    expect(overview.current.recipients[0]?.state).toBe('relayed');
  });

  it('counts a late bounce for the first attempt towards that attempt', () => {
    const lateBounce = stored(
      report([postfixBlock('anna@example.ch', 'failed', 'example.ch', '550 mailbox full')], {
        queueId: 'FIRST01',
      }),
      'anna@example.ch',
      false,
    );

    const overview = deriveDeliveryOverview(
      [
        accepted(['anna@example.ch'], 'FIRST01'),
        {
          ...accepted(['anna@example.ch'], 'SECOND1'),
          retriggeredBy: 'user-1',
          retriggeredAt: '2026-10-06T08:00:00.000Z',
        },
        lateBounce,
      ],
      OPTIONS,
    );

    expect(overview.earlier[0]?.recipients[0]?.state).toBe('failed');
    expect(overview.current.recipients[0]?.state).toBe('noReport');
  });

  it('shows an admin override as the outcome, marked as set by hand', () => {
    const override = {
      retriggeredBy: 'user-1',
      retriggeredAt: '2026-10-06T08:00:00.000Z',
      manualOverride: true,
    };
    const { current } = deriveDeliveryOverview(
      [
        { success: false, to: 'anna@example.ch', error: 'Connection timeout' },
        {
          ...override,
          success: true,
          to: 'anna@example.ch',
          response: { response: 'Status manually set to SUCCESS by Admin' },
        },
        {
          ...override,
          bounceReport: true,
          success: true,
          to: 'anna@example.ch',
          response: { response: 'DSN manually set to SUCCESS by Admin' },
          parsedDsn: { action: 'delivered', status: '2.0.0' },
        },
      ],
      OPTIONS,
    );

    expect(current.recipients).toHaveLength(1);
    expect(current.recipients[0]).toMatchObject({
      state: 'delivered',
      submission: { accepted: false, detail: 'Connection timeout' },
      events: [{ action: 'delivered', manual: true }],
    });
  });

  it('reads a stored row that has no report text from its parsed fields', () => {
    expect(
      statesOf([
        accepted(['anna@example.ch']),
        {
          bounceReport: true,
          success: false,
          to: 'anna@example.ch',
          parsedDsn: { action: 'failed', finalRecipient: 'anna@example.ch' },
        },
      ]),
    ).toEqual({ 'anna@example.ch': 'failed' });
  });

  describe('a log shared by several mails, as on a form submission', () => {
    const staff = 'team@example.ch';
    const submitter = 'anna@example.org';
    const bothSent = [accepted([staff], 'STAFF01'), accepted([submitter], 'USER001')];
    const submitterBounce = stored(
      report([postfixBlock(submitter, 'failed', 'example.org', '550 no such user')], {
        queueId: 'USER001',
      }),
      submitter,
      false,
    );

    it('keeps the other mail in the table when one of them is resent', () => {
      const overview = deriveDeliveryOverview(
        [
          ...bothSent,
          submitterBounce,
          {
            ...accepted([submitter], 'USER002'),
            retriggeredBy: 'user-1',
            retriggeredAt: '2026-10-06T08:00:00.000Z',
          },
        ],
        OPTIONS,
      );

      expect(overview.current.recipients.map(({ address, state }) => [address, state])).toEqual([
        [staff, 'noReport'],
        [submitter, 'noReport'],
      ]);
      expect(overview.earlier).toHaveLength(1);
      expect(overview.earlier[0]?.recipients.map(({ address, state }) => [address, state])).toEqual(
        [[submitter, 'failed']],
      );
    });

    it('gives a report that names nobody to the mail whose queue id it quotes', () => {
      const anonymousBounce = stored(
        report([`Final-Recipient: rfc822;${SYSTEM}\nAction: failed\nStatus: 5.0.0`], {
          queueId: 'USER001',
        }),
        SYSTEM,
        false,
      );
      const staffRelayed = stored(
        report([postfixBlock(submitter, 'relayed', 'relay.example.net', '250 Ok')], {
          queueId: 'USER001',
        }),
        submitter,
      );

      expect(statesOf([...bothSent, staffRelayed, anonymousBounce])).toEqual({
        [staff]: 'noReport',
        [submitter]: 'failed',
      });
    });

    it('applies an override only to the mail it was set on', () => {
      const override = {
        retriggeredBy: 'user-1',
        retriggeredAt: '2026-10-06T08:00:00.000Z',
        manualOverride: true,
        success: true,
        to: staff,
      };

      expect(
        statesOf([
          ...bothSent,
          submitterBounce,
          { ...override, response: { response: 'Status manually set to SUCCESS by Admin' } },
          {
            ...override,
            bounceReport: true,
            response: { response: 'DSN manually set to SUCCESS by Admin' },
            parsedDsn: { action: 'delivered' },
          },
        ]),
      ).toEqual({ [staff]: 'delivered', [submitter]: 'failed' });
    });

    it('still marks a recipient overdue when a member report explains only the list', () => {
      const memberReport = stored(
        report([
          `Original-Recipient: rfc822;${staff}\nFinal-Recipient: rfc822;dora@example.net\nAction: delivered\nStatus: 2.0.0`,
        ]),
        'dora@example.net',
      );

      const { current } = deriveDeliveryOverview([...bothSent, memberReport], {
        ...OPTIONS,
        now: Date.parse('2026-10-20T00:00:00.000Z'),
      });

      expect(
        current.recipients.map(({ address, state, listed }) => [address, state, listed]),
      ).toEqual([
        [staff, 'noReport', true],
        [submitter, 'overdue', undefined],
        ['dora@example.net', 'delivered', undefined],
      ]);
    });
  });

  it('shows two reports of the same kind from the same server as two reports', () => {
    const overview = deriveDeliveryOverview(
      [
        accepted(['anna@example.ch']),
        delayedAt('Mon,  5 Oct 2026 07:10:01'),
        delayedAt('Mon,  5 Oct 2026 11:10:01'),
      ],
      OPTIONS,
    );

    expect(overview.reportCount).toBe(2);
    expect(overview.current.recipients[0]?.events).toHaveLength(2);
    expect(overview.current.recipients[0]?.state).toBe('delayed');
  });

  it('counts a stored mail that is no delivery report as unreadable', () => {
    const overview = deriveDeliveryOverview(
      [
        accepted(['anna@example.ch']),
        stored("Subject: You've received a new message.", SYSTEM, false),
      ],
      OPTIONS,
    );

    expect(overview.unreadableCount).toBe(1);
    expect(overview.current.recipients[0]?.state).toBe('noReport');
  });
});
