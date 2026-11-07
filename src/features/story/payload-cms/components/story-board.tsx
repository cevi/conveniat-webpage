'use client';

import type {
  BoardBlock,
  BoardCard,
  BoardColumn,
} from '@/features/story/payload-cms/story-board-data';
import { PROLOGUE_COLUMN } from '@/features/story/payload-cms/story-board-data';
import { formatStoryDay, formatStoryMoment } from '@/features/story/utils/story-time';
import type { Locale, StaticTranslationString } from '@/types/types';
import { campClockOf, campInstantOf } from '@/utils/camp-clock';
import { cn } from '@/utils/tailwindcss-override';
import { Button, Pill, useDocumentDrawer } from '@payloadcms/ui';
import { CalendarDays, Link2, Plus, Unlink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

const labels = {
  prologue: { de: 'Vorgeschichte', en: 'Backstory', fr: 'Préhistoire' },
  blocks: { de: 'Rollenspiel-Blöcke', en: 'Rollenspiel blocks', fr: 'Blocs du jeu de rôle' },
  blocksSub: { de: 'aus dem Programm', en: 'from the programme', fr: 'du programme' },
  events: { de: 'Ereignisse', en: 'Events', fr: 'Événements' },
  eventsSub: { de: 'was passiert ist', en: 'what happened', fr: 'ce qui s’est passé' },
  figures: { de: 'Figuren', en: 'Figures', fr: 'Personnages' },
  figuresSub: { de: 'Neues über …', en: 'News about …', fr: 'Du nouveau sur …' },
  challenges: { de: 'Challenges', en: 'Challenges', fr: 'Défis' },
  challengesSub: { de: 'Stadtleben, Freizeit', en: 'Stadtleben, free time', fr: 'Temps libre' },
  visible: { de: 'sichtbar', en: 'visible', fr: 'visible' },
  noStory: { de: 'keine Story', en: 'no story', fr: 'pas d’histoire' },
  link: { de: 'verknüpfen', en: 'link', fr: 'lier' },
  addEvent: { de: 'Ereignis', en: 'Event', fr: 'Événement' },
  addFigure: { de: 'Figur', en: 'Figure', fr: 'Personnage' },
  addChallenge: { de: 'Challenge', en: 'Challenge', fr: 'Défi' },
  asOf: {
    de: 'So sehen es Leitende am',
    en: 'What Leitende see on',
    fr: 'Ce que voient les responsables le',
  },
  now: { de: 'Jetzt', en: 'Now', fr: 'Maintenant' },
  noCategory: {
    de: 'Keine Programmkategorie ist als «Gehört zur Story» markiert, darum fehlen die Rollenspiel-Blöcke.',
    en: 'No programme category is marked as part of the story, so the Rollenspiel blocks are missing.',
    fr: 'Aucune catégorie n’est marquée comme faisant partie de l’histoire.',
  },
  openCategories: { de: 'Kategorien öffnen', en: 'Open categories', fr: 'Ouvrir les catégories' },
  unlinked: {
    de: 'Rollenspiel-Blöcke ohne Story',
    en: 'Rollenspiel blocks without a story',
    fr: 'Blocs sans histoire',
  },
} satisfies Record<string, StaticTranslationString>;

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * The value of a `datetime-local` input for a moment, on the camp's clock: the same on the server
 * and in the browser, and the time the story team plans in.
 */
const toInputValue = (iso: string): string => {
  const { dayKey, minutes } = campClockOf(new Date(iso));
  return `${dayKey}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
};

/** The moment a `datetime-local` value means on the camp's clock. */
const fromInputValue = (value: string): Date | undefined => {
  const [dayKey = '', time = ''] = value.split('T');
  const [hours, minutes] = time.split(':').map(Number);
  if (hours === undefined || minutes === undefined) return undefined;
  return campInstantOf(dayKey, hours * 60 + minutes);
};

/** A moment on a camp day, as a new entry's default. */
const atCampTime = (dayKey: string, minutes: number): string | undefined =>
  campInstantOf(dayKey, minutes)?.toISOString();

/** Whether a card is visible yet, as a pill; a span, since the card is a button. */
const VisibilityPill: React.FC<{ card: BoardCard; locale: Locale }> = ({ card, locale }) => (
  <span
    className={cn(
      'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium',
      card.isVisible
        ? 'bg-(--theme-success-100) text-(--theme-success-800)'
        : 'bg-(--theme-elevation-100) text-(--theme-elevation-800)',
    )}
  >
    {card.isVisible || card.visibleFrom === undefined
      ? labels.visible[locale]
      : formatStoryMoment(card.visibleFrom, locale)}
  </span>
);

/** Refreshes the board after a document was saved or deleted in a drawer. */
const useRefreshBoard = (): (() => void) => {
  const router = useRouter();
  return () => router.refresh();
};

const Card: React.FC<{ card: BoardCard; locale: Locale }> = ({ card, locale }) => {
  const refresh = useRefreshBoard();
  const [DocumentDrawer, , { openDrawer }] = useDocumentDrawer({
    collectionSlug: card.collection,
    id: card.id,
  });
  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className={cn(
          'w-full cursor-pointer rounded-(--style-radius-s) border border-(--theme-elevation-150) bg-(--theme-elevation-0) p-2 text-left text-sm',
          'hover:border-(--theme-elevation-400)',
          !card.isVisible && 'border-dashed',
        )}
      >
        <span className="mb-1 line-clamp-2 block font-semibold text-(--theme-text)">
          {card.figureName !== undefined && (
            <span className="text-(--theme-elevation-600)">{card.figureName}: </span>
          )}
          {card.title}
        </span>
        <span className="flex flex-wrap items-center gap-1 text-xs text-(--theme-elevation-500)">
          <VisibilityPill card={card} locale={locale} />
          {card.linkedBlocks > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <CalendarDays className="size-3" aria-hidden />
              {card.linkedBlocks}
            </span>
          )}
          {card.figureNames.length > 0 && (
            <span className="truncate">{card.figureNames.join(', ')}</span>
          )}
        </span>
      </button>
      <DocumentDrawer onSave={refresh} onDelete={refresh} />
    </>
  );
};

const AddButton: React.FC<{
  collection: BoardCard['collection'];
  label: string;
  initialData: Record<string, unknown>;
}> = ({ collection, label, initialData }) => {
  const refresh = useRefreshBoard();
  const [DocumentDrawer, , { openDrawer }] = useDocumentDrawer({ collectionSlug: collection });
  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-(--style-radius-s) border border-dashed border-(--theme-elevation-150) bg-transparent p-1.5 text-xs text-(--theme-elevation-500) hover:border-(--theme-elevation-400) hover:text-(--theme-text)"
      >
        <Plus className="size-3" aria-hidden />
        {label}
      </button>
      <DocumentDrawer initialData={initialData} onSave={refresh} />
    </>
  );
};

const Block: React.FC<{ block: BoardBlock; locale: Locale }> = ({ block, locale }) => {
  const refresh = useRefreshBoard();
  const [DocumentDrawer, , { openDrawer }] = useDocumentDrawer({ collectionSlug: 'story-events' });
  const isLinked = block.storyTitles.length > 0;
  return (
    <div
      className={cn(
        'rounded-(--style-radius-s) border p-2 text-sm',
        isLinked
          ? 'border-(--theme-elevation-150)'
          : 'border-(--theme-error-250) bg-(--theme-error-50)',
      )}
    >
      <div className="font-semibold">
        <span className="tabular-nums">{block.time}</span> {block.title}
      </div>
      {isLinked ? (
        <div className="mt-1 flex items-center gap-1 text-xs text-(--theme-elevation-500)">
          <Link2 className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{block.storyTitles.join(', ')}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={openDrawer}
          className="mt-1 flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs text-(--theme-error-750) underline"
        >
          <Unlink className="size-3" aria-hidden />
          {labels.noStory[locale]} · {labels.link[locale]}
        </button>
      )}
      <DocumentDrawer
        initialData={{
          title: block.newEvent.title,
          day: block.newEvent.day,
          scheduleEntries: [block.id],
          ...(block.newEvent.visibleFrom === undefined
            ? {}
            : { visibleFrom: block.newEvent.visibleFrom }),
        }}
        onSave={refresh}
      />
    </div>
  );
};

const LaneTitle: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div className="border-b border-(--theme-elevation-100) py-3 pr-2 text-sm font-semibold">
    {title}
    <div className="text-xs font-normal text-(--theme-elevation-500)">{sub}</div>
  </div>
);

const Cell: React.FC<{ children: React.ReactNode; isToday: boolean }> = ({ children, isToday }) => (
  <div
    className={cn(
      'flex flex-col gap-1.5 border-b border-l border-(--theme-elevation-100) p-1.5',
      isToday && 'bg-(--theme-elevation-50)',
    )}
  >
    {children}
  </div>
);

/** Moves the board to another moment, or back to now. */
const AsOfPicker: React.FC<{ asOf: string; locale: Locale }> = ({ asOf, locale }) => {
  const router = useRouter();
  const [value, setValue] = useState(toInputValue(asOf));
  const go = (next?: string): void => {
    router.push(next === undefined ? '?' : `?asOf=${encodeURIComponent(next)}`);
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label htmlFor="story-board-as-of" className="text-sm">
        {labels.asOf[locale]}
      </label>
      <input
        id="story-board-as-of"
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const date = fromInputValue(value);
          if (date !== undefined) go(date.toISOString());
        }}
        className="h-8 rounded-(--style-radius-s) border border-(--theme-elevation-150) bg-(--theme-input-bg) px-2 text-sm"
      />
      <Button buttonStyle="secondary" size="small" margin={false} onClick={() => go()}>
        {labels.now[locale]}
      </Button>
    </div>
  );
};

/** The Story-Board's grid: lanes down, camp days across. */
export const StoryBoard: React.FC<{
  columns: BoardColumn[];
  locale: Locale;
  asOf: string;
  hasStoryCategory: boolean;
  categoriesHref: string;
}> = ({ columns, locale, asOf, hasStoryCategory, categoriesHref }) => {
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(
    new Date(asOf),
  );
  const unlinked = columns.reduce(
    (sum, column) => sum + column.blocks.filter((block) => block.storyTitles.length === 0).length,
    0,
  );
  const lane = (
    render: (column: BoardColumn, isPrologue: boolean) => React.ReactNode,
  ): React.ReactNode =>
    columns.map((column) => (
      <Cell key={column.key} isToday={column.key === todayKey}>
        {render(column, column.key === PROLOGUE_COLUMN)}
      </Cell>
    ));

  return (
    <>
      <AsOfPicker asOf={asOf} locale={locale} />
      {!hasStoryCategory && (
        <p className="mb-4 text-sm text-(--theme-elevation-600)">
          {labels.noCategory[locale]} <a href={categoriesHref}>{labels.openCategories[locale]}</a>
        </p>
      )}
      {unlinked > 0 && (
        <div className="mb-4">
          <Pill pillStyle="error" size="small">
            {unlinked} {labels.unlinked[locale]}
          </Pill>
        </div>
      )}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `150px repeat(${String(columns.length)}, 190px)` }}
        >
          <div className="border-b border-(--theme-elevation-150)" />
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                'border-b border-(--theme-elevation-150) px-2 py-2 text-sm font-semibold',
                column.key === todayKey && 'text-(--theme-success-750)',
              )}
            >
              {column.key === PROLOGUE_COLUMN
                ? labels.prologue[locale]
                : formatStoryDay(column.key, locale)}
            </div>
          ))}

          <LaneTitle title={labels.blocks[locale]} sub={labels.blocksSub[locale]} />
          {lane((column) =>
            column.blocks.map((block) => <Block key={block.id} block={block} locale={locale} />),
          )}

          <LaneTitle title={labels.events[locale]} sub={labels.eventsSub[locale]} />
          {lane((column, isPrologue) => (
            <>
              {column.events.map((card) => (
                <Card key={card.id} card={card} locale={locale} />
              ))}
              <AddButton
                collection="story-events"
                label={labels.addEvent[locale]}
                initialData={
                  isPrologue
                    ? { isPrologue: true }
                    : {
                        day: atCampTime(column.key, 12 * 60),
                        visibleFrom: atCampTime(column.key, 21 * 60 + 15),
                      }
                }
              />
            </>
          ))}

          <LaneTitle title={labels.figures[locale]} sub={labels.figuresSub[locale]} />
          {lane((column, isPrologue) => (
            <>
              {column.figureNews.map((card, index) => (
                <Card key={`${card.id}-${String(index)}`} card={card} locale={locale} />
              ))}
              {!isPrologue && (
                <AddButton
                  collection="story-figures"
                  label={labels.addFigure[locale]}
                  initialData={{ visibleFrom: atCampTime(column.key, 21 * 60 + 15) }}
                />
              )}
            </>
          ))}

          <LaneTitle title={labels.challenges[locale]} sub={labels.challengesSub[locale]} />
          {lane((column, isPrologue) => (
            <>
              {column.challenges.map((card) => (
                <Card key={card.id} card={card} locale={locale} />
              ))}
              {!isPrologue && (
                <AddButton
                  collection="story-challenges"
                  label={labels.addChallenge[locale]}
                  initialData={{
                    day: atCampTime(column.key, 12 * 60),
                    visibleFrom: atCampTime(column.key, 7 * 60),
                  }}
                />
              )}
            </>
          ))}
        </div>
      </div>
    </>
  );
};
