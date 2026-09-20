import { isDmarcAggregateReport } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/dmarc-report';
import { simpleParser, type ParsedMail } from 'mailparser';

const BOUNDARY = 'b0undary';

interface MessageParts {
  subject: string;
  attachment?: { filename: string; contentType: string };
  extraHeaders?: string[];
}

/** Builds a raw MIME message the way an aggregate reporter would. */
const rawMessage = ({ subject, attachment, extraHeaders = [] }: MessageParts): string => {
  const lines = [
    'From: noreply-dmarc-support@google.com',
    'To: dmarc@cevi.tools',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
    ...extraHeaders,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'This is an aggregate report from google.com.',
    '',
  ];

  if (attachment) {
    lines.push(
      `--${BOUNDARY}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      Buffer.from('<feedback><report_metadata/></feedback>').toString('base64'),
      '',
    );
  }

  lines.push(`--${BOUNDARY}--`, '');
  return lines.join('\r\n');
};

const report = (overrides: Partial<MessageParts> = {}): Promise<ParsedMail> =>
  simpleParser(
    rawMessage({
      subject: 'Report Domain: cevi.tools Submitter: google.com Report-ID: 1826206578316034048',
      attachment: {
        filename: 'google.com!cevi.tools!1758240000!1758326400.zip',
        contentType: 'application/zip',
      },
      ...overrides,
    }),
  );

describe('isDmarcAggregateReport', () => {
  it('recognises an aggregate report', async () => {
    expect(isDmarcAggregateReport(await report())).toBe(true);
  });

  it('recognises the gzipped XML variant and a report id in the filename', async () => {
    const parsed = await report({
      subject: 'Report domain: cevi.tools Submitter: outlook.com Report-ID: 2b8e1f',
      attachment: {
        filename: 'outlook.com!cevi.tools!1758240000!1758326400!1.xml.gz',
        contentType: 'application/gzip',
      },
    });

    expect(isDmarcAggregateReport(parsed)).toBe(true);
  });

  it('leaves a delivery status notification in the mailbox', async () => {
    const dsn = await simpleParser(
      [
        'From: MAILER-DAEMON@mail.cevi.tools',
        'To: no-reply@cevi.tools',
        'Subject: Undelivered Mail Returned to Sender',
        'MIME-Version: 1.0',
        `Content-Type: multipart/report; report-type=delivery-status; boundary="${BOUNDARY}"`,
        '',
        `--${BOUNDARY}`,
        'Content-Type: text/plain; charset=us-ascii',
        '',
        'This is the mail system at host mail.cevi.tools.',
        '',
        `--${BOUNDARY}`,
        'Content-Type: message/delivery-status',
        '',
        'Reporting-MTA: dns; mail.cevi.tools',
        'Original-Envelope-Id: 6114F8036FCC7',
        '',
        'Final-Recipient: rfc822; someone@example.org',
        'Action: failed',
        'Status: 5.1.1',
        '',
        `--${BOUNDARY}--`,
        '',
      ].join('\r\n'),
    );

    expect(isDmarcAggregateReport(dsn)).toBe(false);
  });

  it('leaves anything carrying an envelope id, however it is shaped', async () => {
    // Defence in depth: the mailbox is shared, and a notification deleted by mistake is one
    // no deployment can ever place again.
    const parsed = await report({ extraHeaders: ['Original-Envelope-Id: 6114F8036FCC7'] });

    expect(isDmarcAggregateReport(parsed)).toBe(false);
  });

  it('leaves anything carrying delivery status, however it is shaped', async () => {
    const parsed = await report({
      attachment: {
        filename: 'google.com!cevi.tools!1758240000!1758326400.zip',
        contentType: 'message/delivery-status',
      },
    });

    expect(isDmarcAggregateReport(parsed)).toBe(false);
  });

  it('leaves a report subject without the report attachment', async () => {
    const parsed = await simpleParser(
      rawMessage({
        subject: 'Report Domain: cevi.tools Submitter: google.com Report-ID: 1826206578316034048',
      }),
    );

    expect(isDmarcAggregateReport(parsed)).toBe(false);
  });

  it('leaves an attachment that only looks like a report filename', async () => {
    const parsed = await report({ subject: 'Fwd: our DMARC numbers for last week' });

    expect(isDmarcAggregateReport(parsed)).toBe(false);
  });

  it('leaves ordinary mail', async () => {
    const parsed = await simpleParser(
      ['From: a@example.org', 'To: no-reply@cevi.tools', 'Subject: Hallo', '', 'Text.', ''].join(
        '\r\n',
      ),
    );

    expect(isDmarcAggregateReport(parsed)).toBe(false);
  });
});
