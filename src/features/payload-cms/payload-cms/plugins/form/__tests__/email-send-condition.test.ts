import { matchesEmailSendCondition } from '@/features/payload-cms/payload-cms/plugins/form/email-send-condition';

describe('matchesEmailSendCondition', () => {
  const slotSubmission = {
    anmeldeart: 'zeitfenster',
    zeitfenster: '2027-07-12 – 2027-07-15',
    jobhauptlager: '-',
  };

  it('sends an email without a condition to every submission', () => {
    expect(matchesEmailSendCondition(undefined, slotSubmission)).toBe(true);
    expect(matchesEmailSendCondition({ field: '', value: 'rolle' }, slotSubmission)).toBe(true);
    expect(matchesEmailSendCondition({ field: '  ', value: 'rolle' }, slotSubmission)).toBe(true);
  });

  it('sends only the email of the branch the person took', () => {
    const slotEmail = { field: 'anmeldeart', value: 'zeitfenster' };
    const roleEmail = { field: 'anmeldeart', value: 'rolle' };

    expect(matchesEmailSendCondition(slotEmail, slotSubmission)).toBe(true);
    expect(matchesEmailSendCondition(roleEmail, slotSubmission)).toBe(false);
  });

  it('treats a field the submission does not carry as empty', () => {
    expect(matchesEmailSendCondition({ field: 'ressortwunsch', value: 'infrastruktur' }, {})).toBe(
      false,
    );
    expect(matchesEmailSendCondition({ field: 'ressortwunsch', value: '' }, {})).toBe(true);
  });

  it('ignores whitespace around the field name an editor typed', () => {
    expect(
      matchesEmailSendCondition({ field: ' anmeldeart ', value: 'zeitfenster' }, slotSubmission),
    ).toBe(true);
  });
});
