import type { SyncHistoryEntry } from '@/features/billing/services/sync-history-summary';
import { summarizeSyncHistory } from '@/features/billing/services/sync-history-summary';

const confirmed = (date: string): SyncHistoryEntry => ({ date, action: 'sync_confirmed' });

const anmeldestatusFlip = (date: string, to: string): SyncHistoryEntry => ({
  date,
  action: 'manual_review_required',
  diff: { missingAnmeldeangaben: { from: '[]', to } },
});

describe('summarizeSyncHistory', () => {
  it('leaves a history that never repeats alone', () => {
    // One sync a night looks like this, and folding it would only cost the operator a click.
    const history = [
      { date: '2026-09-01T18:20:20.000Z', action: 'first_sync' },
      confirmed('2026-09-02T01:00:00.000Z'),
      { date: '2026-09-03T16:14:34.000Z', action: 'bill_generated' },
    ];

    expect(summarizeSyncHistory(history).map((section) => section.kind)).toEqual([
      'entry',
      'entry',
      'entry',
    ]);
  });

  it('folds a stretch of confirmations into one run', () => {
    const history = [confirmed('2026-09-19T16:00:00.000Z'), confirmed('2026-09-19T16:02:00.000Z')];

    const [section] = summarizeSyncHistory(history);

    expect(section).toEqual({
      kind: 'run',
      entries: history,
      actionCounts: [{ action: 'sync_confirmed', count: 2 }],
      changedFields: [],
    });
  });

  it('folds a field that only flaps between two derived values', () => {
    // The registration answers are not always returned, so the validation result flips back
    // and forth on its own. It is worth seeing that it happened, not each time it did.
    const history = [
      anmeldestatusFlip('2026-09-19T16:19:00.000Z', '["Anmeldestatus"]'),
      anmeldestatusFlip('2026-09-19T16:23:20.000Z', '[]'),
      confirmed('2026-09-19T16:25:20.000Z'),
    ];

    const [section] = summarizeSyncHistory(history);

    expect(section).toMatchObject({
      kind: 'run',
      changedFields: ['missingAnmeldeangaben'],
      actionCounts: [
        { action: 'manual_review_required', count: 2 },
        { action: 'sync_confirmed', count: 1 },
      ],
    });
  });

  it('keeps a change that came from the Cevi.DB out of the run', () => {
    const emailChanged: SyncHistoryEntry = {
      date: '2026-09-19T16:21:20.000Z',
      action: 'participant_updated',
      diff: { email: { from: 'alt@example.org', to: 'neu@example.org' } },
    };
    const history = [
      confirmed('2026-09-19T16:19:00.000Z'),
      emailChanged,
      confirmed('2026-09-19T16:23:20.000Z'),
    ];

    expect(summarizeSyncHistory(history)).toEqual([
      { kind: 'entry', entry: history[0] },
      { kind: 'entry', entry: emailChanged },
      { kind: 'entry', entry: history[2] },
    ]);
  });

  it('keeps a status change and the reason it was parked', () => {
    const parked: SyncHistoryEntry = {
      date: '2026-09-19T16:04:50.000Z',
      action: 'manual_review_required',
      reviewReason: 'Pflichtangaben fehlen neu in der Cevi.DB.',
      diff: { status: { from: 'bill_created', to: 'needs_manual_review' } },
    };
    const history = [
      confirmed('2026-09-19T16:02:40.000Z'),
      parked,
      confirmed('2026-09-19T16:09:10.000Z'),
    ];

    expect(summarizeSyncHistory(history)[1]).toEqual({ kind: 'entry', entry: parked });
  });

  it('keeps a value written back to the Cevi.DB visible', () => {
    // Only the write-back actions carry a value today, and those are never routine. The
    // rule belongs on the value rather than on the action list: a value is a thing we told
    // the Cevi.DB, and hiding it behind a click would be losing it.
    const writtenBack: SyncHistoryEntry = {
      date: '2026-09-19T16:21:20.000Z',
      action: 'sync_confirmed',
      value: 'Rechnung gestellt',
    };
    const history = [
      confirmed('2026-09-19T16:19:00.000Z'),
      writtenBack,
      confirmed('2026-09-19T16:23:20.000Z'),
    ];

    expect(summarizeSyncHistory(history)[1]).toEqual({ kind: 'entry', entry: writtenBack });
  });

  it('returns nothing for an empty history', () => {
    expect(summarizeSyncHistory([])).toEqual([]);
  });
});
