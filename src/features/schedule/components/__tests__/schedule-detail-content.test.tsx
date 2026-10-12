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
  ScheduleMiniMap: (): React.ReactNode => <></>,
}));

jest.mock('@/features/payload-cms/components/content-blocks/lexical-rich-text-section', () => ({
  LexicalRichTextSection: (): React.ReactNode => <></>,
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

  it('names when the other Quartiere have the same block', () => {
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

    expect(screen.getByText('13:45 – 15:45 · Quartier 2 - West')).toBeInTheDocument();
  });
});
