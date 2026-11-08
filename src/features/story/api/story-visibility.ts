import { storyDayKeyOf } from '@/features/story/utils/story-time';

/*
What of the story exists at a given moment. Everything the app shows of the story passes
through `visibleStoryAt`, which works on the documents as stored (depth 0) and fails closed: an
entry without a valid `visibleFrom` is hidden, and so is a section tied to an event that is not
visible, a relationship to a figure that is not, and every link to something hidden.
*/

type Reference = string | { id: string } | null | undefined;

export interface RawStoryEvent {
  id: string;
  title?: string | null;
  isPrologue?: boolean | null;
  day?: string | null;
  text?: string | null;
  visibleFrom?: string | null;
  scheduleEntries?: Reference[] | null;
  figures?: Reference[] | null;
  locations?: Reference[] | null;
}

export interface RawStoryFigure {
  id: string;
  name?: string | null;
  role?: string | null;
  belongsTo?: string | null;
  quartier?: Reference;
  photo?: Reference;
  visibleFrom?: string | null;
  knowledge?:
    | { id?: string | null; visibleFrom?: string | null; event?: Reference; text?: string | null }[]
    | null;
  relations?:
    | {
        id?: string | null;
        figure?: Reference;
        visibleFrom?: string | null;
        description?: string | null;
      }[]
    | null;
}

export interface RawStoryChallenge {
  id: string;
  title?: string | null;
  from?: Reference;
  day?: string | null;
  until?: string | null;
  message?: string | null;
  task?: string | null;
  confirmAt?: Reference;
  scheduleEntries?: Reference[] | null;
  visibleFrom?: string | null;
}

export interface VisibleEvent {
  id: string;
  title: string;
  isPrologue: boolean;
  dayKey: string | undefined;
  text: string;
  visibleFrom: string;
  scheduleEntryIds: string[];
  figureIds: string[];
  locationIds: string[];
}

export interface VisibleKnowledge {
  id: string;
  text: string;
  visibleFrom: string;
  eventId: string | undefined;
}

export interface VisibleRelation {
  id: string;
  figureId: string;
  description: string;
  visibleFrom: string;
}

export interface VisibleFigure {
  id: string;
  name: string;
  role: string;
  belongsTo: 'court' | 'quartier' | 'other';
  quartierId: string | undefined;
  photoId: string | undefined;
  visibleFrom: string;
  knowledge: VisibleKnowledge[];
  relations: VisibleRelation[];
}

export interface VisibleChallenge {
  id: string;
  title: string;
  fromId: string | undefined;
  dayKey: string | undefined;
  until: string | undefined;
  message: string;
  task: string;
  confirmAtId: string | undefined;
  scheduleEntryIds: string[];
  visibleFrom: string;
}

export interface VisibleStory {
  events: VisibleEvent[];
  figures: VisibleFigure[];
  challenges: VisibleChallenge[];
}

export const idOf = (reference: Reference): string | undefined => {
  if (typeof reference === 'string') return reference === '' ? undefined : reference;
  if (typeof reference === 'object' && reference !== null && typeof reference.id === 'string') {
    return reference.id;
  }
  return undefined;
};

const idsOf = (references: Reference[] | null | undefined): string[] =>
  (references ?? []).map((reference) => idOf(reference)).filter((id) => id !== undefined);

/** The moment as a number, or `undefined` when it is missing or no date at all. */
const timeOf = (value: string | null | undefined): number | undefined => {
  if (typeof value !== 'string' || value === '') return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
};

/** Whether an entry has appeared: it has a valid `visibleFrom` that is not after `now`. */
export const hasAppeared = (visibleFrom: string | null | undefined, now: Date): boolean => {
  const time = timeOf(visibleFrom);
  return time !== undefined && time <= now.getTime();
};

/** The latest of several moments: an entry appears once every one of its conditions has. */
const latestOf = (values: (string | undefined)[]): string | undefined => {
  let latest: { value: string; time: number } | undefined;
  for (const value of values) {
    const time = timeOf(value);
    if (value === undefined || time === undefined) continue;
    if (latest === undefined || time > latest.time) latest = { value, time };
  }
  return latest?.value;
};

const asBelongsTo = (value: string | null | undefined): VisibleFigure['belongsTo'] =>
  value === 'quartier' || value === 'other' ? value : 'court';

/**
 * The story as it stands at `now`: what may be shown, and nothing else.
 *
 * - An event, a figure or a challenge appears at its own `visibleFrom`.
 * - A section of a figure appears at the latest of its own time, its figure's and its event's,
 *   and not at all while its event is hidden or gone.
 * - A relationship appears once both figures have and its own time, if it has one, has passed.
 * - Links to hidden figures are dropped: from events, from challenges and from relationships.
 */
export const visibleStoryAt = (
  raw: { events: RawStoryEvent[]; figures: RawStoryFigure[]; challenges: RawStoryChallenge[] },
  now: Date,
): VisibleStory => {
  const events: VisibleEvent[] = raw.events
    .filter((event) => hasAppeared(event.visibleFrom, now))
    .map((event) => ({
      id: event.id,
      title: event.title ?? '',
      isPrologue: event.isPrologue === true,
      dayKey: event.isPrologue === true ? undefined : storyDayKeyOf(event.day),
      text: event.text ?? '',
      visibleFrom: event.visibleFrom ?? '',
      scheduleEntryIds: idsOf(event.scheduleEntries),
      figureIds: idsOf(event.figures),
      locationIds: idsOf(event.locations),
    }));
  const eventById = new Map(events.map((event) => [event.id, event]));

  const appearedFigures = raw.figures.filter((figure) => hasAppeared(figure.visibleFrom, now));
  const figureIds = new Set(appearedFigures.map((figure) => figure.id));

  const figures: VisibleFigure[] = appearedFigures.map((figure) => {
    const figureVisibleFrom = figure.visibleFrom ?? '';
    const knowledge = (figure.knowledge ?? []).flatMap((section, index): VisibleKnowledge[] => {
      const eventId = idOf(section.event);
      const event = eventId === undefined ? undefined : eventById.get(eventId);
      // tied to an event that is hidden or gone: hidden as well
      if (eventId !== undefined && event === undefined) return [];
      const visibleFrom = latestOf([
        figureVisibleFrom,
        section.visibleFrom ?? undefined,
        event?.visibleFrom,
      ]);
      if (visibleFrom === undefined || !hasAppeared(visibleFrom, now)) return [];
      const text = section.text ?? '';
      if (text.trim() === '') return [];
      return [{ id: section.id ?? `${figure.id}-k${String(index)}`, text, visibleFrom, eventId }];
    });

    const relations = (figure.relations ?? []).flatMap((relation, index): VisibleRelation[] => {
      const otherId = idOf(relation.figure);
      if (otherId === undefined || otherId === figure.id || !figureIds.has(otherId)) return [];
      const other = appearedFigures.find((candidate) => candidate.id === otherId);
      const visibleFrom = latestOf([
        figureVisibleFrom,
        other?.visibleFrom ?? undefined,
        relation.visibleFrom ?? undefined,
      ]);
      if (visibleFrom === undefined || !hasAppeared(visibleFrom, now)) return [];
      return [
        {
          id: relation.id ?? `${figure.id}-r${String(index)}`,
          figureId: otherId,
          description: relation.description ?? '',
          visibleFrom,
        },
      ];
    });

    return {
      id: figure.id,
      name: figure.name ?? '',
      role: figure.role ?? '',
      belongsTo: asBelongsTo(figure.belongsTo),
      quartierId: idOf(figure.quartier),
      photoId: idOf(figure.photo),
      visibleFrom: figureVisibleFrom,
      knowledge,
      relations,
    };
  });

  const challenges: VisibleChallenge[] = raw.challenges
    .filter((challenge) => hasAppeared(challenge.visibleFrom, now))
    .map((challenge) => {
      const fromId = idOf(challenge.from);
      return {
        id: challenge.id,
        title: challenge.title ?? '',
        fromId: fromId !== undefined && figureIds.has(fromId) ? fromId : undefined,
        dayKey: storyDayKeyOf(challenge.day),
        until: challenge.until ?? undefined,
        message: challenge.message ?? '',
        task: challenge.task ?? '',
        confirmAtId: idOf(challenge.confirmAt),
        scheduleEntryIds: idsOf(challenge.scheduleEntries),
        visibleFrom: challenge.visibleFrom ?? '',
      };
    });

  return {
    events: events.map((event) => ({
      ...event,
      figureIds: event.figureIds.filter((id) => figureIds.has(id)),
    })),
    figures,
    challenges,
  };
};
