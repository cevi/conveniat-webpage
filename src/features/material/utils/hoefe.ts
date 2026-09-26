/** What decides whether somebody belongs to a Hof: its Cevi.DB group and its camp events. */
export interface HofMembershipKeys {
  id: string;
  groupId: string;
  eventIds: string[];
}

/** Cevi.DB ids arrive as numbers from the session and as text from Payload. */
const toCeviId = (value: string | number): number | undefined => {
  const id = typeof value === 'number' ? value : Number(value.trim());
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const toIdSet = (values: (string | number)[]): Set<number> =>
  new Set(values.map((value) => toCeviId(value)).filter((id) => id !== undefined));

/**
 * The Höfe a person belongs to: the ones they lead, through membership in the Hof's Cevi.DB
 * group, and the ones whose camp they are registered for.
 */
export const findMyHofIds = (
  hoefe: HofMembershipKeys[],
  groupIds: number[],
  registeredEventIds: string[],
): string[] => {
  const groups = toIdSet(groupIds);
  const events = toIdSet(registeredEventIds);
  return hoefe
    .filter((hof) => {
      const groupId = toCeviId(hof.groupId);
      if (groupId !== undefined && groups.has(groupId)) return true;
      return hof.eventIds.some((eventId) => {
        const id = toCeviId(eventId);
        return id !== undefined && events.has(id);
      });
    })
    .map((hof) => hof.id);
};
