/**
 * What the app receives of the story: only what has appeared, already resolved, so the client
 * never sees an id it could look up. Every field may be missing in an older persisted cache, so
 * read the optional ones defensively.
 */

export interface StoryFigureSummary {
  id: string;
  name: string;
  role: string;
  /** a picture is only served once the figure is visible, see `story-images` */
  photoUrl?: string | undefined;
}

export interface StoryEventSummary {
  id: string;
  title: string;
  isPrologue: boolean;
  dayKey?: string | undefined;
  excerpt: string;
  /** appeared within the last day */
  isNew: boolean;
}

export interface StoryScheduleEntryLink {
  id: string;
  title: string;
  dayKey?: string | undefined;
  time: string;
}

export interface StoryPlace {
  id: string;
  title: string;
}

export interface StoryEventView extends StoryEventSummary {
  text: string;
  figures: StoryFigureSummary[];
  scheduleEntries: StoryScheduleEntryLink[];
  locations: StoryPlace[];
}

export interface StoryChallengeSummary {
  id: string;
  title: string;
  from?: StoryFigureSummary | undefined;
  dayKey?: string | undefined;
  until?: string | undefined;
  isOver: boolean;
  isNew: boolean;
}

export interface StoryChallengeView extends StoryChallengeSummary {
  message: string;
  task: string;
  confirmAt?: StoryPlace | undefined;
  scheduleEntries: StoryScheduleEntryLink[];
}

export type StoryFigureGroupKey = 'court' | 'quartier' | 'other';

export interface StoryFigureListItem extends StoryFigureSummary {
  quartierName?: string | undefined;
  /** something about the figure appeared within the last day */
  isNew: boolean;
}

export interface StoryFigureView extends StoryFigureSummary {
  belongsTo: StoryFigureGroupKey;
  quartierName?: string | undefined;
  knowledge: { id: string; text: string; dayKey?: string | undefined; isNew: boolean }[];
  relations: { id: string; figure: StoryFigureSummary; description: string }[];
  events: StoryEventSummary[];
  challenges: StoryChallengeSummary[];
}

export interface StoryOverview {
  prologue: StoryEventSummary[];
  days: { dayKey: string; events: StoryEventSummary[] }[];
  figureGroups: { key: StoryFigureGroupKey; figures: StoryFigureListItem[] }[];
}

/** Who may read the story: signed in, a Leitende/r, on a deployment that has it. */
export type StoryAccess = 'ok' | 'signedOut' | 'notLeader';
