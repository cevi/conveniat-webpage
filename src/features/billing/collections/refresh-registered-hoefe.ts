import { refreshUserHoefe } from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload';

type Registration = Partial<
  Pick<BillParticipant, 'userId' | 'eventId' | 'active' | 'status' | 'roleType'>
>;

/** Whether a registration puts its person at the camp of the event's Hof. */
const counts = (registration: Registration): boolean =>
  registration.active !== false && registration.status !== 'removed';

/** Whether a write changed anything that decides the Höfe, or the AVP role, of its person. */
const decidesHoefe = (current: Registration, previous: Registration | undefined): boolean =>
  previous === undefined ||
  previous.userId !== current.userId ||
  previous.eventId !== current.eventId ||
  // the Hauptleitung makes the person the Hof's AVP
  previous.roleType !== current.roleType ||
  counts(previous) !== counts(current);

const toCeviIds = (registrations: (Registration | undefined)[]): number[] => [
  ...new Set(
    registrations
      .map((registration) => Number(registration?.userId))
      .filter((id) => Number.isInteger(id) && id > 0),
  ),
];

/**
 * Refreshes the Höfe of the people a registration belongs to. A failure must not fail the
 * sync that wrote the registration: the next start repairs the Höfe of every user.
 */
const refresh = async (request: PayloadRequest, ceviIds: number[]): Promise<void> => {
  try {
    await refreshUserHoefe(request.payload, { ceviIds, req: request });
  } catch (error: unknown) {
    request.payload.logger.error(
      { err: error, people: ceviIds.length },
      'Could not refresh the Höfe of the people of a changed registration',
    );
  }
};

/**
 * The sync rewrites every registration on every run, so only a write that moves a person to
 * another event, or in or out of the camp, looks at their Höfe.
 */
export const refreshHoefeAfterRegistrationChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const current = doc as Registration;
  const previous = operation === 'create' ? undefined : (previousDoc as Registration);
  if (decidesHoefe(current, previous)) await refresh(req, toCeviIds([current, previous]));
  return doc as unknown;
};

/** A deleted registration takes its person out of the event's Hof. */
export const refreshHoefeAfterRegistrationDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  await refresh(req, toCeviIds([doc as Registration]));
  return doc as unknown;
};
