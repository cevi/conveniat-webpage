import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import {
  needsAnmeldestatusWriteBack,
  writeBackAnmeldestatus,
} from '@/features/billing/services/anmeldestatus-writeback';
import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';

/** The participation edit form, with the Anmeldestatus option given by the test. */
const editForm = (selected: string): string => `
<html><head><meta name="csrf-token" content="meta" /></head><body>
<form>
  <input type="hidden" name="authenticity_token" value="tok" />
  <label class="control-label" for="event_participation_answers_attributes_1_answer">Administrationsangaben &raquo; Anmeldestatus</label>
  <select name="event_participation[answers_attributes][1][answer]">
    <option value=""></option>
    ${['erfasst durch AVP', 'Rechnung gestellt', 'definitiv']
      .map(
        (option) =>
          `<option ${option === selected ? 'selected="selected" ' : ''}value="${option}">${option}</option>`,
      )
      .join('')}
  </select>
  <input value="13656" type="hidden" name="event_participation[answers_attributes][1][question_id]" />
</form>
</body></html>`;

/**
 * A Cevi.DB client that serves a form per GET and records what was posted. `formsInOrder`
 * lists what the successive GETs return, so a test can make the read-back disagree with
 * what was written.
 */
const fakeClient = (
  formsInOrder: string[],
  status = 302,
): {
  client: HitobitoClient;
  submissions: { postUrl: string; formData: Record<string, string | string[]> }[];
  getCount: () => number;
} => {
  const submissions: { postUrl: string; formData: Record<string, string | string[]> }[] = [];
  let getIndex = 0;
  const nextForm = (): string => formsInOrder[Math.min(getIndex++, formsInOrder.length - 1)] ?? '';

  const client = {
    config: { baseUrl: 'https://db.cevi.ch', apiToken: 'token', browserCookie: 'cookie' },
    apiRequest: jest.fn(),
    frontendRequest: jest.fn(() =>
      Promise.resolve({ response: { ok: true, status: 200 } as Response, body: nextForm() }),
    ),
    submitRailsForm: jest.fn(
      (arguments_: { postUrl: string; formData: Record<string, string | string[]> }) => {
        submissions.push({ postUrl: arguments_.postUrl, formData: arguments_.formData });
        return Promise.resolve({
          response: { status, ok: status < 400 } as Response,
          body: '',
          finalUrl: '',
        });
      },
    ),
  } as unknown as HitobitoClient;

  return { client, submissions, getCount: (): number => getIndex };
};

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

/** A Hitobito service that is nothing but the write-back the helper calls. */
const serviceWith = (update: jest.Mock): HitobitoServicePort =>
  ({ updateParticipationAnswer: update }) as unknown as HitobitoServicePort;

const adapterFor = (
  forms: string[],
  status?: number,
): ReturnType<typeof fakeClient> & { adapter: HitobitoServiceAdapter } => {
  const fake = fakeClient(forms, status);
  return { ...fake, adapter: new HitobitoServiceAdapter(fake.client, logger) };
};

describe('HitobitoServiceAdapter.updateParticipationAnswer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts only the addressed answer and re-sends everything else unchanged', async () => {
    const { adapter, submissions } = adapterFor([
      editForm('erfasst durch AVP'),
      editForm('Rechnung gestellt'),
    ]);

    const result = await adapter.updateParticipationAnswer(
      '7',
      '42',
      '900',
      ['anmeldestatus'],
      'Rechnung gestellt',
      ['definitiv'],
    );

    expect(result).toEqual({ changed: true, previous: 'erfasst durch AVP' });
    expect(submissions[0]?.postUrl).toBe('/groups/7/events/42/participations/900');
    expect(submissions[0]?.formData).toEqual({
      'event_participation[answers_attributes][1][answer]': 'Rechnung gestellt',
      button: '',
    });
  });

  it('never overwrites a registration the Anmeldeverantwortliche closed as definitiv', async () => {
    const { adapter, submissions } = adapterFor([editForm('definitiv')]);

    const result = await adapter.updateParticipationAnswer(
      '7',
      '42',
      '900',
      ['anmeldestatus'],
      'Rechnung gestellt',
      ['definitiv'],
    );

    expect(result).toEqual({ changed: false, previous: 'definitiv' });
    expect(submissions).toHaveLength(0);
  });

  it('skips the write when the Cevi.DB already holds the target value', async () => {
    const { adapter, submissions } = adapterFor([editForm('Rechnung gestellt')]);

    const result = await adapter.updateParticipationAnswer(
      '7',
      '42',
      '900',
      ['anmeldestatus'],
      'Rechnung gestellt',
      ['definitiv'],
    );

    expect(result.changed).toBe(false);
    expect(submissions).toHaveLength(0);
  });

  it('fails when the form still shows the old value afterwards', async () => {
    // Hitobito answers a rejected update with the form again, so a 302 alone proves
    // nothing. Only the read-back does.
    const { adapter } = adapterFor([editForm('erfasst durch AVP'), editForm('erfasst durch AVP')]);

    await expect(
      adapter.updateParticipationAnswer('7', '42', '900', ['anmeldestatus'], 'Rechnung gestellt'),
    ).rejects.toThrow('nicht bestätigt');
  });

  it('reports the status of a refused submission', async () => {
    const { adapter } = adapterFor([editForm('erfasst durch AVP')], 422);

    await expect(
      adapter.updateParticipationAnswer('7', '42', '900', ['anmeldestatus'], 'Rechnung gestellt'),
    ).rejects.toThrow('Status 422');
  });

  it('says so when the form carries no such question', async () => {
    const { adapter } = adapterFor(['<form></form>']);

    await expect(
      adapter.updateParticipationAnswer('7', '42', '900', ['anmeldestatus'], 'Rechnung gestellt'),
    ).rejects.toThrow('Keine Frage');
  });
});

describe('writeBackAnmeldestatus', () => {
  const participation = {
    groupId: '7',
    eventId: '42',
    participationUuid: '900',
    fullName: 'Max Mustermann',
    anmeldestatus: 'erfasst durch AVP',
  };
  const writeBackLogger = { warn: jest.fn(), debug: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('records the new value once the Cevi.DB confirmed it', async () => {
    const update = jest.fn().mockResolvedValue({ changed: true, previous: 'erfasst durch AVP' });

    const result = await writeBackAnmeldestatus(
      serviceWith(update),
      participation,
      '2027-02-01T00:00:00.000Z',
      writeBackLogger,
    );

    expect(result.anmeldestatus).toBe('Rechnung gestellt');
    expect(result.historyEntries).toEqual([
      {
        date: '2027-02-01T00:00:00.000Z',
        action: 'anmeldestatus_written_to_cevidb',
        value: 'Rechnung gestellt',
      },
    ]);
    expect(result.error).toBeUndefined();
  });

  it('adopts what the Cevi.DB holds when there was nothing to write', async () => {
    const update = jest.fn().mockResolvedValue({ changed: false, previous: 'definitiv' });

    const result = await writeBackAnmeldestatus(
      serviceWith(update),
      participation,
      '2027-02-01T00:00:00.000Z',
      writeBackLogger,
    );

    expect(result.anmeldestatus).toBe('definitiv');
    expect(result.historyEntries).toEqual([]);
  });

  it('leaves the row alone and names the person when the write-back fails', async () => {
    const update = jest.fn().mockRejectedValue(new Error('Status 422'));

    const result = await writeBackAnmeldestatus(
      serviceWith(update),
      participation,
      '2027-02-01T00:00:00.000Z',
      writeBackLogger,
    );

    expect(result.anmeldestatus).toBe('erfasst durch AVP');
    expect(result.historyEntries[0]?.action).toBe('anmeldestatus_writeback_failed');
    expect(result.historyEntries[0]?.reviewReason).toContain('Status 422');
    expect(result.error).toContain('Max Mustermann');
    expect(writeBackLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('points at the Registrierungs-Einstellungen when no cookie is configured', async () => {
    const result = await writeBackAnmeldestatus(
      undefined,
      participation,
      '2027-02-01T00:00:00.000Z',
      writeBackLogger,
    );

    expect(result.error).toContain('Registrierungs-Einstellungen');
  });

  it('does nothing at all for a row that is already invoiced or definitiv', async () => {
    const update = jest.fn();

    for (const anmeldestatus of ['Rechnung gestellt', 'definitiv']) {
      const result = await writeBackAnmeldestatus(
        serviceWith(update),
        { ...participation, anmeldestatus },
        '2027-02-01T00:00:00.000Z',
        writeBackLogger,
      );
      expect(result.anmeldestatus).toBe(anmeldestatus);
      expect(result.historyEntries).toEqual([]);
    }

    expect(update).not.toHaveBeenCalled();
  });
});

describe('needsAnmeldestatusWriteBack', () => {
  it('is true for a registration the Cevi.DB has not been told about', () => {
    expect(needsAnmeldestatusWriteBack('erfasst durch AVP')).toBe(true);
    // eslint-disable-next-line unicorn/no-null -- the column is nullable
    expect(needsAnmeldestatusWriteBack(null)).toBe(true);
    expect(needsAnmeldestatusWriteBack('')).toBe(true);
  });

  it('is false once the Cevi.DB holds the invoiced or the final answer', () => {
    expect(needsAnmeldestatusWriteBack('Rechnung gestellt')).toBe(false);
    expect(needsAnmeldestatusWriteBack('definitiv')).toBe(false);
  });
});
