import type { HofDashboardFile } from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { HofFileKind } from '@/features/hof-dashboard/constants';
import type { HofFile } from '@/features/payload-cms/payload-types';

/** A submission's files, newest first, numbered per kind in the order they came in. */
export const toFiles = (files: HofFile[]): HofDashboardFile[] => {
  const counters: Record<HofFileKind, number> = { plan: 0, safetyConcept: 0 };
  return files
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((file) => {
      counters[file.kind] += 1;
      return {
        id: file.id,
        filename: file.originalFilename ?? file.filename ?? file.id,
        url: file.url ?? undefined,
        kind: file.kind,
        uploadedAt: file.createdAt,
        version: counters[file.kind],
      };
    })
    .toReversed();
};
