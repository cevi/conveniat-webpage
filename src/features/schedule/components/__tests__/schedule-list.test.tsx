/**
 * @jest-environment jsdom
 */

import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock('next/navigation', () => ({
  useSearchParams: (): URLSearchParams => new URLSearchParams('date=2027-07-25'),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }): React.ReactNode => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@/features/schedule/hooks/use-scroll-restoration', () => ({
  useScrollRestoration: (): { saveScrollPosition: jest.Mock } => ({
    saveScrollPosition: jest.fn(),
  }),
}));

jest.mock('@/features/schedule/components/enrollment-action', () => ({
  EnrollmentAction: (): React.ReactNode => <div>Anmelden</div>,
}));

// eslint-disable-next-line import/first
import { ScheduleList } from '@/features/schedule/components/schedule-list';

const emptyRichText = {
  root: { type: 'root', format: '', indent: 0, version: 1, children: [] },
} as unknown as CampScheduleEntryFrontendType['description'];

const entry = (
  id: string,
  time: string,
  extra: Partial<CampScheduleEntryFrontendType> = {},
): CampScheduleEntryFrontendType => ({
  id,
  title: id,
  description: emptyRichText,
  timeslot: { date: '2027-07-25T12:00:00.000Z', time },
  // eslint-disable-next-line unicorn/no-null
  location: null,
  ...extra,
});

const renderList = (
  entries: CampScheduleEntryFrontendType[],
  properties: Partial<React.ComponentProps<typeof ScheduleList>> = {},
): void => {
  render(
    <ScheduleList
      entries={entries}
      enrolledIds={new Set()}
      starredIds={new Set()}
      minutesOfToday={undefined}
      currentId={undefined}
      quartierChips={undefined}
      {...properties}
    />,
  );
};

describe('ScheduleList', () => {
  it('opens the detail page of a programme block, with the date kept', () => {
    renderList([entry('Kennenlernspiel', '15:45 - 17:45', { kind: 'program' })]);

    expect(screen.getByRole('link', { name: /Kennenlernspiel/ })).toHaveAttribute(
      'href',
      '/app/schedule?date=2027-07-25&id=Kennenlernspiel',
    );
  });

  it('shows a meal, a fixed point and a transfer as plain lines that open nothing', () => {
    renderList([
      entry('Tagwache', '07:30 - 07:30', { kind: 'fixpoint' }),
      entry('Essen', '08:00 - 09:00', { kind: 'meal' }),
      entry('Verschiebung', '09:00 - 09:30', { kind: 'transfer' }),
    ]);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('07:30')).toBeInTheDocument();
    expect(screen.queryByText('bis 07:30')).toBeNull();
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('bis 09:00')).toBeInTheDocument();
    expect(screen.getByText('30 min Verschiebung')).toBeInTheDocument();
  });

  it('treats an entry saved before the kind existed as a programme block', () => {
    renderList([entry('Seilbrücke', '10:00 - 11:00')]);

    expect(screen.getByRole('link', { name: /Seilbrücke/ })).toBeInTheDocument();
  });

  it('keeps the enrolment of a workshop reachable from the list', () => {
    renderList([
      entry('Seilbrücke', '10:00 - 11:00', { enable_enrolment: true }),
      entry('Lageraufbau', '11:00 - 12:00'),
    ]);

    expect(screen.getAllByText('Anmelden')).toHaveLength(1);
  });

  it('names the Quartiere of a block in the view of the whole camp only', () => {
    const block = entry('Turnierformen', '13:45 - 15:45', {
      quartiere: [
        { id: 'q1', name: 'Quartier 1 - Ost' },
        { id: 'q3', name: 'Quartier 3 - Nord' },
      ],
    });

    renderList([block]);
    expect(screen.queryByText('Q1')).toBeNull();
  });

  it('shortens the Quartier names to chips', () => {
    renderList(
      [
        entry('Turnierformen', '13:45 - 15:45', {
          quartiere: [
            { id: 'q1', name: 'Quartier 1 - Ost' },
            { id: 'q3', name: 'Quartier 3 - Nord' },
          ],
        }),
      ],
      { quartierChips: new Set(['q1']) },
    );

    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q3')).toBeInTheDocument();
  });
});
