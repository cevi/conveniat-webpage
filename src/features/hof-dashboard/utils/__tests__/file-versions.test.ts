import { toFiles } from '@/features/hof-dashboard/utils/file-versions';
import type { HofFile } from '@/features/payload-cms/payload-types';

const file = (id: string, kind: HofFile['kind'], createdAt: string): HofFile => ({
  id,
  kind,
  createdAt,
  updatedAt: createdAt,
  filename: `${id}.pdf`,
  url: `/api/hof-files/file/${id}.pdf`,
  hof: 'hof-nord',
  submission: 'submission-1',
});

describe('toFiles', () => {
  it('lists the newest file first and numbers the versions of each kind separately', () => {
    const files = toFiles([
      file('plan-2', 'plan', '2026-10-03T10:00:00.000Z'),
      file('plan-1', 'plan', '2026-10-01T10:00:00.000Z'),
      file('concept-1', 'safetyConcept', '2026-10-02T10:00:00.000Z'),
    ]);
    expect(files.map(({ id, version }) => [id, version])).toEqual([
      ['plan-2', 2],
      ['concept-1', 1],
      ['plan-1', 1],
    ]);
  });

  it('shows the name the Hof uploaded, not the one storage gave a duplicate', () => {
    const [shown] = toFiles([
      { ...file('plan-2', 'plan', '2026-10-03T10:00:00.000Z'), originalFilename: 'Plan.pdf' },
    ]);
    expect(shown?.filename).toBe('Plan.pdf');
  });
});
