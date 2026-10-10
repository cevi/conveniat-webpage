import { pipelineLockFor } from '@/features/billing/services/pipeline-lock';

describe('pipelineLockFor', () => {
  it('lets the next step start once the one before it finished cleanly', () => {
    expect(pipelineLockFor({ status: 'success', summary: { errors: [] } })).toBeUndefined();
    expect(pipelineLockFor({ status: 'success' })).toBeUndefined();
  });

  it('says the step before has never run when there is no job for it', () => {
    const jobs: { sync?: { status: 'success' } } = {};

    expect(pipelineLockFor(jobs.sync)).toBe('never-run');
  });

  it('says the step before is still running, which is not the same as never having succeeded', () => {
    expect(pipelineLockFor({ status: 'pending' })).toBe('running');
  });

  it('says the last run was unsuccessful when it failed, was cancelled or reported errors', () => {
    expect(pipelineLockFor({ status: 'failed' })).toBe('unsuccessful');
    expect(pipelineLockFor({ status: 'success', summary: { cancelled: true } })).toBe(
      'unsuccessful',
    );
    expect(pipelineLockFor({ status: 'success', summary: { errors: ['Cevi.DB 500'] } })).toBe(
      'unsuccessful',
    );
  });
});
