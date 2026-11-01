import { pipelineLockFor } from '@/features/billing/services/pipeline-lock';

describe('pipelineLockFor', () => {
  it('lets the next step start once the one before it ran to the end', () => {
    expect(pipelineLockFor({ status: 'success', summary: { errors: [] } })).toBeUndefined();
    expect(pipelineLockFor({ status: 'success' })).toBeUndefined();
  });

  it('lets the next step start even when the one before it reported errors', () => {
    // A participant whose payment Cevi.DB refuses is reported on every sync. Locking on it
    // would leave bill generation locked until that one record is fixed.
    expect(
      pipelineLockFor({
        status: 'success',
        summary: { errors: ['Zahlung für Teilnahme 4711 nicht bestätigt'] },
      }),
    ).toBeUndefined();
  });

  it('says the step before has never run when there is no job for it', () => {
    const jobs: { sync?: { status: 'success' } } = {};

    expect(pipelineLockFor(jobs.sync)).toBe('never-run');
  });

  it('says the step before is still running, which is not the same as never having succeeded', () => {
    expect(pipelineLockFor({ status: 'pending' })).toBe('running');
  });

  it('says the last run was unsuccessful when it failed or was cancelled', () => {
    expect(pipelineLockFor({ status: 'failed' })).toBe('unsuccessful');
    expect(pipelineLockFor({ status: 'success', summary: { cancelled: true } })).toBe(
      'unsuccessful',
    );
  });
});
