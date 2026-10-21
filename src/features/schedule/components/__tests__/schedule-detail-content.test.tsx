/**
 * @jest-environment jsdom
 */

import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

// The organiser rows carry a chat button that creates the chat through tRPC.
jest.mock('@/trpc/client', () => ({
  trpc: {
    chat: {
      createChat: { useMutation: (): unknown => ({ mutate: jest.fn(), isPending: false }) },
    },
  },
}));
jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: (): boolean => true,
}));

/**
 * The contact block is the subject here; the rest of the detail page pulls in the editor, the
 * map and the whole trpc status pipeline, none of which say anything about how an organiser is
 * named.
 */
jest.mock('@/features/schedule/context/schedule-status-context', () => ({
  ScheduleStatusProvider: ({ children }: { children: React.ReactNode }): React.ReactNode =>
    children,
  useCourseStatus: (): { status: undefined; isLoading: boolean } => ({
    status: undefined,
    isLoading: false,
  }),
}));

jest.mock('@/features/schedule/components/participant-list', () => ({
  ParticipantList: (): React.ReactNode => <></>,
}));

jest.mock('@/features/schedule/components/workshop-admin-actions', () => ({
  WorkshopAdminActions: (): React.ReactNode => <></>,
}));

jest.mock('@/features/schedule/components/enrollment-action', () => ({
  EnrollmentAction: (): React.ReactNode => <></>,
}));

jest.mock('@/features/schedule/components/schedule-mini-map', () => ({
  mapCenterOf: (): undefined => undefined,
  ScheduleMiniMap: (): React.ReactNode => <></>,
}));

// prints the words of the rich text, so a test can tell whether a description is shown
jest.mock('@/features/payload-cms/components/content-blocks/lexical-rich-text-section', () => ({
  LexicalRichTextSection: ({ richTextSection }: { richTextSection: unknown }): React.ReactNode => (
    <>{/"text":"([^"]*)"/.exec(JSON.stringify(richTextSection))?.[1]}</>
  ),
}));

jest.mock('@/components/ui/markdown-editor', () => ({
  MarkdownEditor: (): React.ReactNode => <></>,
}));

// eslint-disable-next-line import/first
import { ScheduleDetailContent } from '@/features/schedule/components/schedule-detail-content';

/** An empty Lexical document; the rich-text section that would render it is mocked out. */
const emptyRichText = {
  root: { type: 'root', format: '', indent: 0, version: 1, children: [] },
} as unknown as CampScheduleEntryFrontendType['description'];

/**
 * The prop is typed as the full payload document, but what actually arrives is the trimmed
 * shape the schedule API serialises - so the entry is built from that and handed over the way
 * the page does it.
 */
const entryWith = (organiser: CampScheduleEntryFrontendType['organiser']): CampScheduleEntry => {
  const entry: CampScheduleEntryFrontendType = {
    id: 'entry-1',
    title: 'Workshop Feuermachen',
    description: emptyRichText,
    timeslot: { date: '2027-07-27', time: '09:00 - 11:00' },
    // eslint-disable-next-line unicorn/no-null
    location: null,
    organiser,
  };

  return entry as unknown as CampScheduleEntry;
};

describe('ScheduleDetailContent organisers', () => {
  /**
   * Participants know the organiser of a programme block by their Ceviname, so the contact row
   * spells it out the way the chat contact list does - "Vorname Nachname v/o Ceviname".
   */
  it('spells out the Ceviname of an organiser who has one', () => {
    render(
      <ScheduleDetailContent
        entry={entryWith([{ id: 'org-1', fullName: 'Anna Muster', nickname: 'Ameise' }])}
        locale="de"
      />,
    );

    expect(screen.getByText('Anna Muster v/o Ameise')).toBeInTheDocument();
  });

  /**
   * The schedule is public and cached in the browser, so an organiser's address must not be shown
   * even when an entry still carries one, as a query cache persisted before the fix does. The chat
   * button is how participants reach an organiser.
   */
  it('does not show the email of an organiser', () => {
    const staleOrganiser = { id: 'org-1', fullName: 'Anna Muster', email: 'anna@example.org' };
    render(<ScheduleDetailContent entry={entryWith([staleOrganiser])} locale="de" />);

    expect(screen.queryByText('anna@example.org')).toBeNull();
  });

  it('falls back to the plain name when no Ceviname is set', () => {
    render(
      <ScheduleDetailContent
        entry={entryWith([{ id: 'org-1', fullName: 'Anna Muster' }])}
        locale="de"
      />,
    );

    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });
});

describe('ScheduleDetailContent tabs', () => {
  const block = {
    ...entryWith([]),
    steps: [
      { phase: 'intro', duration: 15, title: 'Gruppen bilden' },
      { phase: 'main', duration: 55, title: 'Völkarten' },
    ],
    bring: [{ item: 'Trinkflasche' }],
  } as unknown as CampScheduleEntry;

  const leaderNotes = {
    materials: [{ amount: '15', item: 'Malpfosten', responsible: 'MAT' }],
    safety: 'Die TN tragen gutes Schuhwerk.',
  };

  it('shows a participant what to bring and the steps with the times of this slot', () => {
    render(<ScheduleDetailContent entry={block} locale="de" />);

    expect(screen.getByText('Trinkflasche')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Material' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Sicherheit' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Ablauf' }));

    // the block starts at 09:00, so its second step starts a quarter of an hour in
    expect(screen.getByText('Völkarten')).toBeInTheDocument();
    expect(screen.getByText('09:15')).toBeInTheDocument();
  });

  it('gives a leader the material list and the safety notes', () => {
    render(<ScheduleDetailContent entry={block} locale="de" leaderNotes={leaderNotes} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Material' }));
    expect(screen.getByText('Malpfosten')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Sicherheit' }));
    expect(screen.getByText('Die TN tragen gutes Schuhwerk.')).toBeInTheDocument();
  });

  it('shows no tabs for an entry that only has an overview', () => {
    render(<ScheduleDetailContent entry={entryWith([])} locale="de" />);

    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('lists when the other Quartiere have the same block', () => {
    const other: CampScheduleEntryFrontendType = {
      id: 'entry-2',
      title: 'Workshop Feuermachen',
      description: emptyRichText,
      timeslot: { date: '2027-07-27', time: '13:45 - 15:45' },
      // eslint-disable-next-line unicorn/no-null
      location: null,
      quartiere: [{ id: 'q2', name: 'Quartier 2 - West' }],
    };

    render(<ScheduleDetailContent entry={entryWith([])} locale="de" otherSlots={[other]} />);

    expect(screen.getByText('Weitere Zeitfenster')).toBeInTheDocument();
    expect(screen.getByText('13:45–15:45')).toBeInTheDocument();
    expect(screen.getByText('· Q2 West')).toBeInTheDocument();
  });
});

const richText = (text: string): CampScheduleEntry['description'] =>
  ({
    root: {
      type: 'root',
      version: 1,
      children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text }] }],
    },
  }) as unknown as CampScheduleEntry['description'];

const q = (number: number, name: string): { id: string; name: string } => ({
  id: `q${number}`,
  name: `Quartier ${number} - ${name}`,
});

const slot = (
  id: string,
  time: string,
  quartiere: { id: string; name: string }[],
  extra: Partial<CampScheduleEntryFrontendType> = {},
): CampScheduleEntryFrontendType => ({
  id,
  title: 'Ballspiele',
  description: richText('Ballspiele.'),
  timeslot: { date: '2027-07-24T12:00:00.000Z', time },
  // eslint-disable-next-line unicorn/no-null
  location: null,
  kind: 'program',
  quartiere,
  ...extra,
});

const mine = slot('mine', '17:00 - 17:30', [q(4, 'Kitsune'), q(5, 'Greif'), q(6, 'Cerberus')]);
const theirs = slot('theirs', '17:00 - 18:00', [q(7, 'Phönix'), q(8, 'Baku')]);

const renderDetail = (
  properties: Partial<React.ComponentProps<typeof ScheduleDetailContent>> = {},
): void => {
  render(
    <ScheduleDetailContent
      entry={theirs as unknown as CampScheduleEntry}
      locale="de"
      slotEntry={mine}
      isOwnSlot
      myQuartierIds={new Set(['q5'])}
      otherSlots={[theirs]}
      {...properties}
    />,
  );
};

describe('ScheduleDetailContent slots and what comes next', () => {
  it("leads with the user's own slot, even when another slot was opened", () => {
    renderDetail();

    expect(screen.getByText(/17:00–17:30/)).toBeInTheDocument();
    expect(screen.getByText('30 min · Zeitfenster deines Quartiers')).toBeInTheDocument();
    expect(screen.getByText('Weitere Zeitfenster')).toBeInTheDocument();
    expect(screen.getByText('17:00–18:00')).toBeInTheDocument();
  });

  it('hides a description that only repeats the title, and shows one that says more', () => {
    const { unmount } = render(
      <ScheduleDetailContent entry={mine as unknown as CampScheduleEntry} locale="de" />,
    );
    expect(screen.queryByText('Ballspiele.')).toBeNull();
    unmount();

    renderDetail({
      entry: {
        ...mine,
        description: richText('Ballspiele für alle Stufen.'),
      } as unknown as CampScheduleEntry,
    });
    expect(screen.getByText('Ballspiele für alle Stufen.')).toBeInTheDocument();
  });

  it('says what comes next and opens the next block', () => {
    const onOpenEntry = jest.fn();
    const essen = slot('essen', '18:00 - 18:30', [q(5, 'Greif')], { title: 'Essen', kind: 'meal' });
    const freiesSpiel = slot('freies-spiel', '18:45 - 19:30', [q(5, 'Greif')], {
      title: 'Freies Spiel',
    });

    renderDetail({ whatComesNext: { next: essen, nextBlock: freiesSpiel }, onOpenEntry });

    const after = screen.getByRole('link', { name: /Danach 18:00 Essen · dann Freies Spiel/ });
    fireEvent.click(after);
    expect(onOpenEntry).toHaveBeenCalledWith('freies-spiel');
  });
});
