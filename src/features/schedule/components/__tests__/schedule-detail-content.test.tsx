/**
 * @jest-environment jsdom
 */

import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { render, screen } from '@testing-library/react';
import type React from 'react';

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
        entry={entryWith([
          { id: 'org-1', fullName: 'Anna Muster', nickname: 'Ameise', email: 'anna@example.org' },
        ])}
        locale="de"
      />,
    );

    expect(screen.getByText('Anna Muster v/o Ameise')).toBeInTheDocument();
    expect(screen.getByText('anna@example.org')).toBeInTheDocument();
  });

  it('falls back to the plain name when no Ceviname is set', () => {
    render(
      <ScheduleDetailContent
        entry={entryWith([{ id: 'org-1', fullName: 'Anna Muster', email: 'anna@example.org' }])}
        locale="de"
      />,
    );

    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
  });
});
