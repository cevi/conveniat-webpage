import type {
  RawStoryChallenge,
  RawStoryEvent,
  RawStoryFigure,
} from '@/features/story/api/story-visibility';
import { hasAppeared, idOf } from '@/features/story/api/story-visibility';
import { storyDayKeyOf } from '@/features/story/utils/story-time';
import { campInstantOf } from '@/utils/camp-clock';

/** The column of the backstory, before the first day. */
export const PROLOGUE_COLUMN = 'prologue';

export interface BoardCard {
  collection: 'story-events' | 'story-figures' | 'story-challenges';
  id: string;
  title: string;
  /** the figure's name, for a section of what is known about it */
  figureName?: string;
  visibleFrom: string | undefined;
  /** appeared at the moment the board shows */
  isVisible: boolean;
  linkedBlocks: number;
  figureNames: string[];
}

export interface BoardBlock {
  id: string;
  title: string;
  time: string;
  /** titles of the events that link the block */
  storyTitles: string[];
  /** what a new event for this block starts with */
  newEvent: { day: string; visibleFrom: string | undefined };
}

export interface BoardColumn {
  key: string;
  blocks: BoardBlock[];
  events: BoardCard[];
  figureNews: BoardCard[];
  challenges: BoardCard[];
}

export interface RawScheduleBlock {
  id: string;
  title?: string | null;
  timeslot?: { date?: string | null; time?: string | null } | null;
}

const byTime = (a: BoardCard, b: BoardCard): number =>
  (a.visibleFrom ?? '').localeCompare(b.visibleFrom ?? '');

/** Minutes past midnight of `HH:mm`, or `undefined`. */
const minutesOf = (time: string | undefined): number | undefined => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time?.trim() ?? '');
  if (match === null) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
};

/** A quarter of an hour after the block ends: when its event should appear. */
const suggestedVisibleFrom = (dayKey: string, time: string): string | undefined => {
  const end = minutesOf(time.split('-')[1]);
  if (end === undefined) return undefined;
  return campInstantOf(dayKey, end + 15)?.toISOString();
};

/**
 * The Story-Board: one column per camp day, the backstory first, with the Rollenspiel blocks of
 * the programme, the events, the news about figures and the challenges of each day. `asOf` is
 * the moment the board pretends it is, to check what Leitende would see then.
 */
export const buildStoryBoard = ({
  events,
  figures,
  challenges,
  blocks,
  asOf,
}: {
  events: RawStoryEvent[];
  figures: RawStoryFigure[];
  challenges: RawStoryChallenge[];
  blocks: RawScheduleBlock[];
  asOf: Date;
}): BoardColumn[] => {
  const columns = new Map<string, BoardColumn>();
  const column = (key: string): BoardColumn => {
    let found = columns.get(key);
    if (found === undefined) {
      found = { key, blocks: [], events: [], figureNews: [], challenges: [] };
      columns.set(key, found);
    }
    return found;
  };
  // the backstory always has its column, so there is somewhere to start
  column(PROLOGUE_COLUMN);
  const figureName = new Map(figures.map((figure) => [figure.id, figure.name ?? '']));
  const namesOf = (references: RawStoryEvent['figures']): string[] =>
    (references ?? []).flatMap((reference) => figureName.get(idOf(reference) ?? '') ?? []);

  for (const event of events) {
    const key = event.isPrologue === true ? PROLOGUE_COLUMN : storyDayKeyOf(event.day);
    if (key === undefined) continue;
    column(key).events.push({
      collection: 'story-events',
      id: event.id,
      title: event.title ?? '',
      visibleFrom: event.visibleFrom ?? undefined,
      isVisible: hasAppeared(event.visibleFrom, asOf),
      linkedBlocks: (event.scheduleEntries ?? []).length,
      figureNames: namesOf(event.figures),
    });
  }

  const eventById = new Map(events.map((event) => [event.id, event]));
  /** The column of an event: the backstory's, or its camp day. */
  const columnOfEvent = (event: RawStoryEvent | undefined): string | undefined => {
    if (event === undefined) return undefined;
    return event.isPrologue === true ? PROLOGUE_COLUMN : storyDayKeyOf(event.day);
  };
  for (const figure of figures) {
    // a figure first appears with the earliest event it is part of, else on its own date
    const firstEvent = events
      .filter((event) => (event.figures ?? []).some((reference) => idOf(reference) === figure.id))
      .sort((a, b) => (a.visibleFrom ?? '').localeCompare(b.visibleFrom ?? ''))[0];
    const firstDay = columnOfEvent(firstEvent) ?? storyDayKeyOf(figure.visibleFrom);
    if (firstDay !== undefined) {
      column(firstDay).figureNews.push({
        collection: 'story-figures',
        id: figure.id,
        title: figure.role ?? '',
        figureName: figure.name ?? '',
        visibleFrom: figure.visibleFrom ?? undefined,
        isVisible: hasAppeared(figure.visibleFrom, asOf),
        linkedBlocks: 0,
        figureNames: [],
      });
    }
    for (const section of figure.knowledge ?? []) {
      const event = eventById.get(idOf(section.event) ?? '');
      // a section without a time and an event is part of the profile
      if (event === undefined && (section.visibleFrom ?? undefined) === undefined) continue;
      const visibleFrom = section.visibleFrom ?? event?.visibleFrom ?? figure.visibleFrom;
      const day = columnOfEvent(event) ?? storyDayKeyOf(visibleFrom);
      if (day === undefined) continue;
      column(day).figureNews.push({
        collection: 'story-figures',
        id: figure.id,
        title: section.text ?? '',
        figureName: figure.name ?? '',
        visibleFrom: visibleFrom ?? undefined,
        isVisible:
          hasAppeared(visibleFrom, asOf) &&
          hasAppeared(figure.visibleFrom, asOf) &&
          (event === undefined || hasAppeared(event.visibleFrom, asOf)),
        linkedBlocks: 0,
        figureNames: [],
      });
    }
  }

  for (const challenge of challenges) {
    const key = storyDayKeyOf(challenge.day) ?? storyDayKeyOf(challenge.visibleFrom);
    if (key === undefined) continue;
    column(key).challenges.push({
      collection: 'story-challenges',
      id: challenge.id,
      title: challenge.title ?? '',
      visibleFrom: challenge.visibleFrom ?? undefined,
      isVisible: hasAppeared(challenge.visibleFrom, asOf),
      linkedBlocks: (challenge.scheduleEntries ?? []).length,
      figureNames: figureName.has(idOf(challenge.from) ?? '')
        ? [figureName.get(idOf(challenge.from) ?? '') ?? '']
        : [],
    });
  }

  for (const block of blocks) {
    const dayKey = storyDayKeyOf(block.timeslot?.date);
    if (dayKey === undefined) continue;
    const time = block.timeslot?.time ?? '';
    column(dayKey).blocks.push({
      id: block.id,
      title: block.title ?? '',
      time: time.replace(' - ', '–'),
      storyTitles: events
        .filter((event) => (event.scheduleEntries ?? []).some((entry) => idOf(entry) === block.id))
        .map((event) => event.title ?? ''),
      newEvent: {
        day: block.timeslot?.date ?? '',
        visibleFrom: suggestedVisibleFrom(dayKey, time),
      },
    });
  }

  for (const entry of columns.values()) {
    entry.events.sort(byTime);
    entry.figureNews.sort(byTime);
    entry.challenges.sort(byTime);
    entry.blocks.sort((a, b) => a.time.localeCompare(b.time));
  }

  return [...columns.values()].sort((a, b) => {
    if (a.key === PROLOGUE_COLUMN) return -1;
    if (b.key === PROLOGUE_COLUMN) return 1;
    return a.key.localeCompare(b.key);
  });
};
