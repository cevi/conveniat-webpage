import type {
  VisibleChallenge,
  VisibleEvent,
  VisibleFigure,
  VisibleStory,
} from '@/features/story/api/story-visibility';
import { hasAppeared, visibleStoryAt } from '@/features/story/api/story-visibility';
import type {
  StoryChallengeSummary,
  StoryChallengeView,
  StoryEventSummary,
  StoryEventView,
  StoryFigureGroupKey,
  StoryFigureListItem,
  StoryFigureSummary,
  StoryFigureView,
  StoryOverview,
  StoryPlace,
  StoryScheduleEntryLink,
} from '@/features/story/types';
import { storyDayKeyOf } from '@/features/story/utils/story-time';
import type { Locale } from '@/types/types';
import type { Payload } from 'payload';

/** How long an entry counts as new after it appeared. */
const NEW_FOR_MS = 24 * 60 * 60 * 1000;

const EXCERPT_LENGTH = 140;

const FIGURE_GROUP_ORDER: StoryFigureGroupKey[] = ['court', 'quartier', 'other'];

const isNewAt = (visibleFrom: string, now: Date): boolean => {
  const time = new Date(visibleFrom).getTime();
  return !Number.isNaN(time) && now.getTime() - time < NEW_FOR_MS;
};

const excerptOf = (text: string): string => {
  const firstParagraph = text.trim().split(/\n\s*\n/)[0] ?? '';
  return firstParagraph.length > EXCERPT_LENGTH
    ? `${firstParagraph.slice(0, EXCERPT_LENGTH).trimEnd()}…`
    : firstParagraph;
};

/** What a visible story's ids point at, read in one go: pictures, Quartiere, places and blocks. */
interface StoryLookups {
  photoUrlById: Map<string, string>;
  quartierNameById: Map<string, string>;
  placeById: Map<string, StoryPlace>;
  scheduleEntryById: Map<string, StoryScheduleEntryLink>;
}

const findByIds = async <T>(
  payload: Payload,
  collection: 'story-images' | 'quartiere' | 'camp-map-annotations' | 'camp-schedule-entry',
  ids: Set<string>,
  locale: Locale,
  select: Record<string, true>,
): Promise<T[]> => {
  if (ids.size === 0) return [];
  const { docs } = await payload.find({
    collection,
    where: { id: { in: [...ids] } },
    select,
    depth: 0,
    limit: 0,
    pagination: false,
    locale,
    fallbackLocale: 'de',
    overrideAccess: true,
  });
  return docs as unknown as T[];
};

const loadLookups = async (
  payload: Payload,
  story: VisibleStory,
  locale: Locale,
  now: Date,
): Promise<StoryLookups> => {
  const photoIds = new Set(story.figures.flatMap((figure) => figure.photoId ?? []));
  const quartierIds = new Set(story.figures.flatMap((figure) => figure.quartierId ?? []));
  const placeIds = new Set([
    ...story.events.flatMap((event) => event.locationIds),
    ...story.challenges.flatMap((challenge) => challenge.confirmAtId ?? []),
  ]);
  const scheduleEntryIds = new Set([
    ...story.events.flatMap((event) => event.scheduleEntryIds),
    ...story.challenges.flatMap((challenge) => challenge.scheduleEntryIds),
  ]);

  const [images, quartiere, places, entries] = await Promise.all([
    findByIds<{
      id: string;
      url?: string | null;
      visibleFrom?: string | null;
      sizes?: { portrait?: { url?: string | null } | null } | null;
    }>(payload, 'story-images', photoIds, locale, {
      url: true,
      visibleFrom: true,
      sizes: true,
    }),
    findByIds<{ id: string; name?: string | null }>(payload, 'quartiere', quartierIds, locale, {
      name: true,
    }),
    findByIds<{ id: string; title?: string | null }>(
      payload,
      'camp-map-annotations',
      placeIds,
      locale,
      { title: true },
    ),
    findByIds<{ id: string; title?: string | null; timeslot?: { date?: string; time?: string } }>(
      payload,
      'camp-schedule-entry',
      scheduleEntryIds,
      locale,
      { title: true, timeslot: true },
    ),
  ]);

  const photoUrlById = new Map<string, string>();
  for (const image of images) {
    // the picture's own visibility is checked too, as its file route does
    if (!hasAppeared(image.visibleFrom, now)) continue;
    const url = image.sizes?.portrait?.url ?? image.url;
    if (typeof url === 'string' && url !== '') photoUrlById.set(image.id, url);
  }

  return {
    photoUrlById,
    quartierNameById: new Map(
      quartiere.flatMap((quartier) =>
        typeof quartier.name === 'string' ? [[quartier.id, quartier.name]] : [],
      ),
    ),
    placeById: new Map(
      places.map((place) => [place.id, { id: place.id, title: place.title ?? '' }]),
    ),
    scheduleEntryById: new Map(
      entries.map((entry) => [
        entry.id,
        {
          id: entry.id,
          title: entry.title ?? '',
          dayKey: storyDayKeyOf(entry.timeslot?.date),
          time: (entry.timeslot?.time ?? '').replace(' - ', '–'),
        },
      ]),
    ),
  };
};

/**
 * The story as it stands now, with what its ids point at. The database only returns what has
 * appeared, and `visibleStoryAt` checks every entry, section and link once more.
 */
export class StoryReader {
  private constructor(
    private readonly story: VisibleStory,
    private readonly lookups: StoryLookups,
    private readonly now: Date,
  ) {}

  /** Reads the story for `locale` as it stands at `now`. */
  static async load(payload: Payload, locale: Locale, now: Date): Promise<StoryReader> {
    const read = {
      where: { visibleFrom: { less_than_equal: now.toISOString() } },
      depth: 0,
      locale,
      fallbackLocale: 'de',
      overrideAccess: true,
    } as const;
    const [events, figures, challenges] = await Promise.all([
      payload.find({
        collection: 'story-events',
        ...read,
        sort: 'visibleFrom',
        limit: 0,
        pagination: false,
      }),
      payload.find({
        collection: 'story-figures',
        ...read,
        sort: 'name',
        limit: 0,
        pagination: false,
      }),
      payload.find({
        collection: 'story-challenges',
        ...read,
        sort: 'visibleFrom',
        limit: 0,
        pagination: false,
      }),
    ]);
    const story = visibleStoryAt(
      { events: events.docs, figures: figures.docs, challenges: challenges.docs },
      now,
    );
    return new StoryReader(story, await loadLookups(payload, story, locale, now), now);
  }

  private figure(id: string | undefined): VisibleFigure | undefined {
    return id === undefined ? undefined : this.story.figures.find((figure) => figure.id === id);
  }

  private figureSummary(figure: VisibleFigure): StoryFigureSummary {
    return {
      id: figure.id,
      name: figure.name,
      role: figure.role,
      photoUrl:
        figure.photoId === undefined ? undefined : this.lookups.photoUrlById.get(figure.photoId),
    };
  }

  private eventSummary(event: VisibleEvent): StoryEventSummary {
    return {
      id: event.id,
      title: event.title,
      isPrologue: event.isPrologue,
      dayKey: event.dayKey,
      excerpt: excerptOf(event.text),
      isNew: isNewAt(event.visibleFrom, this.now),
    };
  }

  private challengeSummary(challenge: VisibleChallenge): StoryChallengeSummary {
    const from = this.figure(challenge.fromId);
    const untilTime = challenge.until === undefined ? Number.NaN : Date.parse(challenge.until);
    return {
      id: challenge.id,
      title: challenge.title,
      from: from === undefined ? undefined : this.figureSummary(from),
      dayKey: challenge.dayKey,
      until: challenge.until,
      isOver: !Number.isNaN(untilTime) && untilTime < this.now.getTime(),
      isNew: isNewAt(challenge.visibleFrom, this.now),
    };
  }

  private entriesOf(ids: string[]): StoryScheduleEntryLink[] {
    return ids.flatMap((id) => this.lookups.scheduleEntryById.get(id) ?? []);
  }

  /** The Vorgeschichte, the events by day, and the figures by where they belong. */
  overview(): StoryOverview {
    const byDay = new Map<string, StoryEventSummary[]>();
    for (const event of this.story.events) {
      if (event.isPrologue || event.dayKey === undefined) continue;
      byDay.set(event.dayKey, [...(byDay.get(event.dayKey) ?? []), this.eventSummary(event)]);
    }
    const figureGroups = FIGURE_GROUP_ORDER.map((key) => ({
      key,
      figures: this.story.figures
        .filter((figure) => figure.belongsTo === key)
        .map((figure): StoryFigureListItem => ({
          ...this.figureSummary(figure),
          quartierName:
            figure.quartierId === undefined
              ? undefined
              : this.lookups.quartierNameById.get(figure.quartierId),
          isNew:
            isNewAt(figure.visibleFrom, this.now) ||
            figure.knowledge.some((section) => isNewAt(section.visibleFrom, this.now)),
        })),
    })).filter((group) => group.figures.length > 0);

    return {
      prologue: this.story.events
        .filter((event) => event.isPrologue)
        .map((event) => this.eventSummary(event)),
      days: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dayKey, events]) => ({ dayKey, events })),
      figureGroups,
    };
  }

  /** One event, or `undefined` when it has not appeared or does not exist. */
  event(id: string): StoryEventView | undefined {
    const event = this.story.events.find((candidate) => candidate.id === id);
    if (event === undefined) return undefined;
    return {
      ...this.eventSummary(event),
      text: event.text,
      figures: event.figureIds.flatMap((figureId) => {
        const figure = this.figure(figureId);
        return figure === undefined ? [] : [this.figureSummary(figure)];
      }),
      scheduleEntries: this.entriesOf(event.scheduleEntryIds),
      locations: event.locationIds.flatMap((placeId) => this.lookups.placeById.get(placeId) ?? []),
    };
  }

  /** One figure with what is known so far, or `undefined` when it has not appeared. */
  figureView(id: string): StoryFigureView | undefined {
    const figure = this.figure(id);
    if (figure === undefined) return undefined;
    return {
      ...this.figureSummary(figure),
      belongsTo: figure.belongsTo,
      quartierName:
        figure.quartierId === undefined
          ? undefined
          : this.lookups.quartierNameById.get(figure.quartierId),
      knowledge: [...figure.knowledge]
        .sort((a, b) => Date.parse(b.visibleFrom) - Date.parse(a.visibleFrom))
        .map((section) => ({
          id: section.id,
          text: section.text,
          dayKey: storyDayKeyOf(section.visibleFrom),
          isNew: isNewAt(section.visibleFrom, this.now),
        })),
      relations: figure.relations.flatMap((relation) => {
        const other = this.figure(relation.figureId);
        return other === undefined
          ? []
          : [
              {
                id: relation.id,
                figure: this.figureSummary(other),
                description: relation.description,
              },
            ];
      }),
      events: this.story.events
        .filter((event) => event.figureIds.includes(figure.id))
        .map((event) => this.eventSummary(event)),
      challenges: this.story.challenges
        .filter((challenge) => challenge.fromId === figure.id)
        .map((challenge) => this.challengeSummary(challenge)),
    };
  }

  /** Every challenge that has appeared, by day. */
  challengesByDay(): { dayKey: string; challenges: StoryChallengeSummary[] }[] {
    const byDay = new Map<string, StoryChallengeSummary[]>();
    for (const challenge of this.story.challenges) {
      const dayKey = challenge.dayKey ?? storyDayKeyOf(challenge.visibleFrom) ?? '';
      byDay.set(dayKey, [...(byDay.get(dayKey) ?? []), this.challengeSummary(challenge)]);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, challenges]) => ({ dayKey, challenges }));
  }

  /** One challenge, or `undefined` when it has not appeared. */
  challenge(id: string): StoryChallengeView | undefined {
    const challenge = this.story.challenges.find((candidate) => candidate.id === id);
    if (challenge === undefined) return undefined;
    return {
      ...this.challengeSummary(challenge),
      message: challenge.message,
      task: challenge.task,
      confirmAt:
        challenge.confirmAtId === undefined
          ? undefined
          : this.lookups.placeById.get(challenge.confirmAtId),
      scheduleEntries: this.entriesOf(challenge.scheduleEntryIds),
    };
  }

  /** What of the story belongs to a block of the programme, by the ids of its slots. */
  ofScheduleEntries(entryIds: string[]): {
    events: StoryEventSummary[];
    challenges: StoryChallengeSummary[];
  } {
    return {
      events: this.story.events
        .filter((event) => event.scheduleEntryIds.some((id) => entryIds.includes(id)))
        .map((event) => this.eventSummary(event)),
      challenges: this.story.challenges
        .filter((challenge) => challenge.scheduleEntryIds.some((id) => entryIds.includes(id)))
        .map((challenge) => this.challengeSummary(challenge)),
    };
  }

  /** For Home: the challenges still open, and the newest event if it is new. */
  highlights(): { openChallenges: StoryChallengeSummary[]; latestEvent?: StoryEventSummary } {
    const latest = this.story.events.at(-1);
    const latestEvent =
      latest !== undefined && isNewAt(latest.visibleFrom, this.now)
        ? this.eventSummary(latest)
        : undefined;
    return {
      openChallenges: this.story.challenges
        .map((challenge) => this.challengeSummary(challenge))
        .filter((challenge) => !challenge.isOver)
        .slice(-3),
      ...(latestEvent === undefined ? {} : { latestEvent }),
    };
  }
}
