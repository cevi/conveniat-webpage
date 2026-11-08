import type { StoryFigure } from '@/features/payload-cms/payload-types';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload';

const idOf = (value: StoryFigure['photo'] | undefined): string | undefined => {
  if (typeof value === 'string') return value;
  return value?.id;
};

/**
 * Gives a picture the earliest `visibleFrom` of the figures showing it, or none when no figure
 * uses it any more. Its read access compares against this, so its file is served no earlier
 * than the first figure it belongs to.
 */
const recomputeImageVisibility = async (
  request: PayloadRequest,
  imageId: string,
): Promise<void> => {
  const { docs } = await request.payload.find({
    collection: 'story-figures',
    where: { photo: { equals: imageId } },
    select: { visibleFrom: true },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req: request,
  });
  const earliest = docs
    .map((figure) => figure.visibleFrom)
    .filter((value): value is string => typeof value === 'string')
    .sort()[0];
  // by `where`, not by id: a picture deleted before its figure is then no error
  await request.payload.update({
    collection: 'story-images',
    where: { id: { equals: imageId } },
    data: { visibleFrom: earliest ?? null },
    overrideAccess: true,
    depth: 0,
    req: request,
  });
};

/** After a figure is saved, its old and its new photo follow the figure's visibility. */
export const syncStoryImageVisibility: CollectionAfterChangeHook<StoryFigure> = async ({
  doc,
  previousDoc,
  req: request,
}) => {
  const ids = new Set(
    [idOf(doc.photo), idOf(previousDoc.photo)].filter((id): id is string => id !== undefined),
  );
  for (const imageId of ids) {
    await recomputeImageVisibility(request, imageId);
  }
  return doc;
};

/**
 * After a figure is deleted, its photo follows the figures left showing it, and is hidden again
 * when none is: else a picture shared with a figure still to come stays readable.
 */
export const syncDeletedFigureImageVisibility: CollectionAfterDeleteHook<StoryFigure> = async ({
  doc,
  req: request,
}) => {
  const imageId = idOf(doc.photo);
  if (imageId !== undefined) await recomputeImageVisibility(request, imageId);
  return doc;
};
