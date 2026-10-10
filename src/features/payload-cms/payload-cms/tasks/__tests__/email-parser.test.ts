import { determineDeliveryStatus } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/email-parser';
import type { ParsedMail } from 'mailparser';

const notification = (subject: string, report: string): ParsedMail =>
  ({ subject, text: report, attachments: [], headers: new Map() }) as unknown as ParsedMail;

const recipients = (report: string): unknown[] =>
  determineDeliveryStatus(notification('Undelivered Mail Returned to Sender', report))
    .recipientBounces;

const block = (email: string): string =>
  [`Final-Recipient: rfc822; ${email}`, 'Action: delivered'].join('\n');

describe('determineDeliveryStatus', () => {
  it('reports a failure for the address delivery was attempted to, not for our return address', () => {
    // The order our mail server writes. `Original-Recipient` repeats the ORCPT we sent,
    // which is the return address of every mail.
    const report = [
      'Reporting-MTA: dns; mail.example.net',
      '',
      'Final-Recipient: rfc822; gone@example.com',
      'Original-Recipient: rfc822;noreply@cevi.tools',
      'Action: failed',
      'Status: 5.1.1',
      'Diagnostic-Code: smtp; 550 5.1.1 recipient rejected - address unknown',
    ].join('\n');

    expect(recipients(report)).toEqual([
      { email: 'gone@example.com', action: 'failed', status: '5.1.1', isSuccess: false },
    ]);
  });

  it('reads the same report when the original recipient is named first', () => {
    const report = [
      'Original-Recipient: rfc822;noreply@cevi.tools',
      'Final-Recipient: rfc822; gone@example.com',
      'Action: failed',
      'Status: 5.1.1',
    ].join('\n');

    expect(recipients(report)).toEqual([
      { email: 'gone@example.com', action: 'failed', status: '5.1.1', isSuccess: false },
    ]);
  });

  it('keeps the verdicts of several recipients apart', () => {
    const report = [
      'Final-Recipient: rfc822; gone@example.com',
      'Original-Recipient: rfc822;noreply@cevi.tools',
      'Action: failed',
      'Status: 5.1.1',
      '',
      'Final-Recipient: rfc822; avp@example.com',
      'Original-Recipient: rfc822;noreply@cevi.tools',
      'Action: delivered',
      'Status: 2.0.0',
    ].join('\n');

    expect(recipients(report)).toEqual([
      { email: 'gone@example.com', action: 'failed', status: '5.1.1', isSuccess: false },
      { email: 'avp@example.com', action: 'delivered', status: '2.0.0', isSuccess: true },
    ]);
  });

  it('falls back to the original recipient when the report names no other', () => {
    const report = ['Original-Recipient: rfc822;gone@example.com', 'Action: failed'].join('\n');

    expect(recipients(report)).toEqual([
      { email: 'gone@example.com', action: 'failed', isSuccess: false },
    ]);
  });

  it('counts a mail a distribution list took over as a success', () => {
    const report = [
      'Final-Recipient: RFC822; team@example.com',
      'Action: expanded (to multi-recipient alias)',
      'Status: 2.0.0',
    ].join('\n');

    expect(
      determineDeliveryStatus(notification('Return receipt', report)).recipientBounces,
    ).toEqual([
      { email: 'team@example.com', action: 'expanded', status: '2.0.0', isSuccess: true },
    ]);
  });

  it('stores the status fields when only the attachment carries them', () => {
    const status = ['Final-Recipient: rfc822; avp@example.com', 'Action: delivered'].join('\n');
    const parsed = {
      subject: 'Delivered',
      text: 'Your message has been delivered.',
      attachments: [{ contentType: 'message/delivery-status', content: Buffer.from(status) }],
      headers: new Map(),
    } as unknown as ParsedMail;

    expect(determineDeliveryStatus(parsed).dsnString).toContain(
      'Final-Recipient: rfc822; avp@example.com',
    );
  });

  it('stores the status fields when the body names only some of the recipients', () => {
    const parsed = {
      subject: 'Delivered',
      text: block('avp@example.com'),
      attachments: [
        {
          contentType: 'message/delivery-status',
          content: Buffer.from([block('avp@example.com'), block('coach@example.com')].join('\n\n')),
        },
      ],
      headers: new Map(),
    } as unknown as ParsedMail;

    expect(determineDeliveryStatus(parsed).dsnString).toContain(
      'Final-Recipient: rfc822; coach@example.com',
    );
  });
});
