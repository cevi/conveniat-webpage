/* eslint-disable unicorn/no-null */
import {
  markBillMailFailed,
  markBillMailNotQueued,
  markBillMailSent,
  staleBillMailReason,
} from '@/features/billing/services/bill-mail-status';
import type { Payload } from 'payload';

interface Row {
  status?: string;
  anmeldestatus?: string;
  billSentDate?: string;
  syncHistory?: {
    date?: string;
    action: string;
    value?: string;
    reviewReason?: string;
    outgoingEmail?: string;
    previous?: string;
    diff?: unknown;
  }[];
  [key: string]: unknown;
}

/**
 * A registration as the database holds it: every update lands on `row`, so a test reads
 * the state the code leaves behind rather than the calls it made on the way.
 */
const payloadDouble = (
  participant: Row | null,
  deliveredMails: unknown[] = [],
): { payload: Payload; update: jest.Mock; find: jest.Mock; row: Row } => {
  const row: Row = { ...participant };
  const update = jest.fn(({ data }: { data: Row }) => {
    Object.assign(row, data);
    return Promise.resolve(row);
  });
  const find = jest.fn().mockResolvedValue({ docs: deliveredMails });
  const payload = {
    findByID: jest.fn().mockResolvedValue(participant),
    find,
    update,
    logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  } as unknown as Payload;
  return { payload, update, find, row };
};

/** A Cevi.DB session whose write answers with `result`. */
const ceviDB = (result: {
  changed: boolean;
  previous: string;
}): { connect: jest.Mock; updateParticipationAnswer: jest.Mock } => {
  const updateParticipationAnswer = jest.fn().mockResolvedValue(result);
  return {
    updateParticipationAnswer,
    connect: jest.fn().mockResolvedValue({ updateParticipationAnswer }),
  };
};
const REVERTED = { changed: true, previous: 'Rechnung gestellt' };
const WRITTEN = { changed: true, previous: 'erfasst durch AVP' };

const mail = { id: 'mail-1', to: 'eltern@example.com', createdAt: '2027-01-10T08:00:00.000Z' };
const registration = {
  groupId: '7',
  eventId: '42',
  participationUuid: '900',
  fullName: 'Max Muster',
  anmeldestatus: 'Rechnung gestellt',
  billCreatedDate: '2027-01-09T08:00:00.000Z',
};
const written = {
  date: '2027-01-10T08:00:01.000Z',
  action: 'anmeldestatus_written_to_cevidb',
  value: 'Rechnung gestellt',
  previous: 'erfasst durch AVP',
};
const actionsOf = (row: Row): string[] => (row.syncHistory ?? []).map((entry) => entry.action);

describe('markBillMailSent', () => {
  it('marks a bill as sent once its queued mail has left, and keeps the history it has now', async () => {
    const queued = {
      date: '2027-01-10T08:00:00.000Z',
      action: 'bill_queued_for_eltern@example.com',
    };
    const { payload, row } = payloadDouble({ status: 'bill_mail_pending', syncHistory: [queued] });

    await markBillMailSent(payload, 'p1', mail);

    expect(row.status).toBe('bill_sent');
    expect(typeof row.billSentDate).toBe('string');
    expect(actionsOf(row)).toEqual([
      'bill_queued_for_eltern@example.com',
      'bill_sent_to_eltern@example.com',
    ]);
  });

  it.each(['bill_created', 'bill_sent', 'reminder_sent', 'needs_manual_review', 'removed'])(
    'leaves a registration in "%s" alone',
    async (status) => {
      const { payload, update } = payloadDouble({ status, syncHistory: [] });

      await markBillMailSent(payload, 'p1', mail);

      expect(update).not.toHaveBeenCalled();
    },
  );
});

describe('markBillMailFailed', () => {
  it.each(['bill_created', 'bill_mail_pending', 'bill_sent', 'reminder_sent'])(
    'parks a bill in "%s" for review once its mail bounced, and says why',
    async (status) => {
      const { payload, row } = payloadDouble({ ...registration, status, syncHistory: [] });

      await markBillMailFailed(payload, 'p1', mail, ceviDB(REVERTED).connect);

      expect(row.status).toBe('needs_manual_review');
      const [failure] = row.syncHistory ?? [];
      expect(failure?.reviewReason).toContain('eltern@example.com');
      expect(failure?.reviewReason).toContain('mail-1');
    },
  );

  it('puts the Anmeldestatus in the Cevi.DB back to what it was before the bill', async () => {
    const { payload, row } = payloadDouble({
      ...registration,
      status: 'bill_sent',
      syncHistory: [written],
    });
    const { connect, updateParticipationAnswer } = ceviDB(REVERTED);

    await markBillMailFailed(payload, 'p1', mail, connect);

    // Only while the Cevi.DB still reads what we wrote.
    expect(updateParticipationAnswer).toHaveBeenCalledWith(
      '7',
      '42',
      '900',
      ['anmeldestatus'],
      'erfasst durch AVP',
      [],
      'Rechnung gestellt',
    );
    expect(row.status).toBe('needs_manual_review');
    expect(row.anmeldestatus).toBe('erfasst durch AVP');
    expect(actionsOf(row)).toEqual([
      'anmeldestatus_written_to_cevidb',
      'bill_mail_failed_to_eltern@example.com',
      'anmeldestatus_reverted_in_cevidb',
    ]);
  });

  it('parks the bill before it touches the Cevi.DB', async () => {
    const { payload, update } = payloadDouble({
      ...registration,
      status: 'bill_sent',
      syncHistory: [written],
    });
    const { connect, updateParticipationAnswer } = ceviDB(REVERTED);

    await markBillMailFailed(payload, 'p1', mail, connect);

    const [parkedAt] = update.mock.invocationCallOrder;
    const [revertedAt] = updateParticipationAnswer.mock.invocationCallOrder;
    expect(parkedAt).toBeLessThan(revertedAt ?? 0);
  });

  it('keeps a value someone set in the Cevi.DB since', async () => {
    const { payload, row } = payloadDouble({
      ...registration,
      status: 'bill_sent',
      syncHistory: [written],
    });

    await markBillMailFailed(
      payload,
      'p1',
      mail,
      ceviDB({ changed: false, previous: 'definitiv' }).connect,
    );

    expect(row.status).toBe('needs_manual_review');
    expect(row.anmeldestatus).toBe('definitiv');
  });

  it('says so when the value before the bill was never recorded', async () => {
    const { payload, row } = payloadDouble({
      ...registration,
      status: 'bill_sent',
      // Written before the previous value was recorded.
      syncHistory: [{ date: written.date, action: written.action, value: written.value }],
    });
    const { connect, updateParticipationAnswer } = ceviDB(REVERTED);

    await markBillMailFailed(payload, 'p1', mail, connect);

    expect(updateParticipationAnswer).not.toHaveBeenCalled();
    const entry = row.syncHistory?.at(-1);
    expect(entry?.action).toBe('anmeldestatus_revert_failed');
    expect(entry?.reviewReason).toContain('von Hand');
  });

  it('records a failed revert for the operator', async () => {
    const { payload, row } = payloadDouble({
      ...registration,
      status: 'bill_sent',
      syncHistory: [written],
    });
    const updateParticipationAnswer = jest.fn().mockRejectedValue(new Error('Status 500'));

    await markBillMailFailed(
      payload,
      'p1',
      mail,
      jest.fn().mockResolvedValue({ updateParticipationAnswer }),
    );

    expect(row.status).toBe('needs_manual_review');
    expect(row.anmeldestatus).toBe('Rechnung gestellt');
    expect(row.syncHistory?.at(-1)?.reviewReason).toContain('Status 500');
  });

  it('records that the Cevi.DB was not reverted when no session could be opened', async () => {
    const { payload, row } = payloadDouble({
      ...registration,
      status: 'bill_sent',
      syncHistory: [written],
    });

    await markBillMailFailed(payload, 'p1', mail, jest.fn().mockRejectedValue(new Error('down')));

    expect(row.status).toBe('needs_manual_review');
    expect(row.syncHistory?.at(-1)?.action).toBe('anmeldestatus_revert_failed');
  });

  it('does not contact the Cevi.DB when nothing was written to it', async () => {
    const { payload } = payloadDouble({ ...registration, status: 'bill_created', syncHistory: [] });
    const { connect } = ceviDB(REVERTED);

    await markBillMailFailed(payload, 'p1', mail, connect);

    expect(connect).not.toHaveBeenCalled();
  });

  it('does not revert twice', async () => {
    const reverted = {
      date: '2027-01-11T08:00:00.000Z',
      action: 'anmeldestatus_reverted_in_cevidb',
    };
    const { payload } = payloadDouble({
      ...registration,
      status: 'needs_manual_review',
      syncHistory: [written, reverted],
    });
    const { connect, updateParticipationAnswer } = ceviDB(REVERTED);

    await markBillMailFailed(payload, 'p1', mail, connect);

    expect(updateParticipationAnswer).not.toHaveBeenCalled();
  });

  it('leaves the bill alone once a mail of the same bill has arrived', async () => {
    const { payload, update, find } = payloadDouble(
      { ...registration, status: 'bill_sent', syncHistory: [written] },
      [{ id: 'mail-2' }],
    );
    const { connect } = ceviDB(REVERTED);

    await markBillMailFailed(payload, 'p1', mail, connect);

    expect(update).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    // Any delivered mail of the current bill counts, earlier or later, but not this one.
    expect(JSON.stringify(find.mock.calls[0])).toContain(registration.billCreatedDate);
  });

  it('ignores a late bounce of a bill that has since been replaced', async () => {
    const { payload, update } = payloadDouble({
      ...registration,
      status: 'bill_created',
      billCreatedDate: '2027-01-12T08:00:00.000Z',
      syncHistory: [written],
    });

    await markBillMailFailed(payload, 'p1', mail, ceviDB(REVERTED).connect);

    expect(update).not.toHaveBeenCalled();
  });

  it.each(['paid', 'removed', 'new', 'pflichtangaben_missing'])(
    'leaves a registration in "%s" alone',
    async (status) => {
      const { payload, update } = payloadDouble({ ...registration, status, syncHistory: [] });

      await markBillMailFailed(payload, 'p1', mail, ceviDB(REVERTED).connect);

      expect(update).not.toHaveBeenCalled();
    },
  );

  it('does nothing for a registration that no longer exists', async () => {
    const { payload, update } = payloadDouble(null);

    await markBillMailFailed(payload, 'p1', mail, ceviDB(REVERTED).connect);

    expect(update).not.toHaveBeenCalled();
  });
});

/** A row as `markBillMailFailed` leaves it, before anything else happens to it. */
const parkedBy = async (
  status: string,
): Promise<{ payload: Payload; row: Row; update: jest.Mock }> => {
  const double = payloadDouble({
    ...registration,
    status,
    syncHistory: [written],
  });
  await markBillMailFailed(double.payload, 'p1', mail, ceviDB(REVERTED).connect);
  (double.payload.findByID as jest.Mock).mockResolvedValue({ ...double.row });
  double.update.mockClear();
  return double;
};

describe('markBillMailNotQueued', () => {
  it('parks a bill whose mail could not be queued and reverts the Cevi.DB', async () => {
    const { payload, row } = payloadDouble({
      ...registration,
      status: 'bill_mail_pending',
      syncHistory: [written],
    });

    await markBillMailNotQueued(payload, 'p1', 'S3 unreachable', ceviDB(REVERTED).connect);

    expect(row.status).toBe('needs_manual_review');
    expect(row.anmeldestatus).toBe('erfasst durch AVP');
    expect(actionsOf(row).slice(-2)).toEqual([
      'bill_mail_not_queued',
      'anmeldestatus_reverted_in_cevidb',
    ]);
  });
});

describe('a bill parked because its mail failed, when that mail arrives after all', () => {
  it('goes back to sent, and the Cevi.DB reads "Rechnung gestellt" again', async () => {
    const { payload, row } = await parkedBy('bill_sent');
    const { connect, updateParticipationAnswer } = ceviDB(WRITTEN);

    await markBillMailSent(payload, 'p1', mail, connect);

    expect(row.status).toBe('bill_sent');
    expect(updateParticipationAnswer).toHaveBeenCalledWith(
      '7',
      '42',
      '900',
      ['anmeldestatus'],
      'Rechnung gestellt',
      ['definitiv'],
    );
    expect(row.anmeldestatus).toBe('Rechnung gestellt');
    expect(actionsOf(row).slice(-2)).toEqual([
      'bill_sent_to_eltern@example.com',
      'anmeldestatus_written_to_cevidb',
    ]);
  });

  it('stays a reminder when it was one', async () => {
    const { payload, row } = await parkedBy('reminder_sent');

    await markBillMailSent(payload, 'p1', mail, ceviDB(WRITTEN).connect);

    expect(row.status).toBe('reminder_sent');
  });

  it('stays parked when another mail is the one that arrived', async () => {
    const { payload, update } = await parkedBy('bill_sent');

    await markBillMailSent(payload, 'p1', { ...mail, id: 'mail-0' }, ceviDB(WRITTEN).connect);

    expect(update).not.toHaveBeenCalled();
  });

  it('stays parked when the Cevi.DB data changed while it waited', async () => {
    const { payload, row, update } = await parkedBy('bill_sent');
    (payload.findByID as jest.Mock).mockResolvedValue({
      ...row,
      syncHistory: [
        ...(row.syncHistory ?? []),
        {
          date: '2027-01-12T01:00:00.000Z',
          action: 'participant_updated',
          diff: { email: { from: 'eltern@example.com', to: 'neu@example.com' } },
        },
      ],
    });

    await markBillMailSent(payload, 'p1', mail, ceviDB(WRITTEN).connect);

    expect(update).not.toHaveBeenCalled();
  });

  it('stays parked when it already was before the mail failed', async () => {
    const { payload, update } = await parkedBy('needs_manual_review');

    await markBillMailSent(payload, 'p1', mail, ceviDB(WRITTEN).connect);

    expect(update).not.toHaveBeenCalled();
  });
});

describe('staleBillMailReason', () => {
  it('lets the mail of a bill that is still waiting for it go out', async () => {
    const { payload } = payloadDouble({ status: 'bill_mail_pending' });

    expect(await staleBillMailReason(payload, { billParticipant: 'p1' })).toBeUndefined();
  });

  it('stops the mail of a registration that was cancelled while it waited', async () => {
    const { payload } = payloadDouble({ status: 'removed' });

    expect(await staleBillMailReason(payload, { billParticipant: 'p1' })).toContain('removed');
  });

  it('stops the mail of a registration that no longer exists', async () => {
    const { payload } = payloadDouble(null);

    expect(
      await staleBillMailReason(payload, { billParticipant: { id: 'p1' } as never }),
    ).toContain('no longer exists');
  });

  it('has no opinion on a mail that is not a bill', async () => {
    const { payload } = payloadDouble(null);

    expect(await staleBillMailReason(payload, {})).toBeUndefined();
  });
});
