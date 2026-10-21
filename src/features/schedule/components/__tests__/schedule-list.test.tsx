/**
 * @jest-environment jsdom
 */

import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { fireEvent, render, screen } from '@testing-library/react';
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
      onToggleStar={jest.fn()}
      myQuartierIds={new Set()}
      groupSlots={false}
      now={undefined}
      {...properties}
    />,
  );
};

const q = (number: number): { id: string; name: string } => ({
  id: `q${number}`,
  name: `Quartier ${number}`,
});

beforeAll(() => {
  // jsdom lays nothing out and cannot scroll
  Element.prototype.scrollIntoView = jest.fn();
});

describe('ScheduleList', () => {
  it('opens the detail page of a programme block, with the date kept', () => {
    renderList([entry('Kennenlernspiel', '15:45 - 17:45', { kind: 'program' })]);

    expect(screen.getByRole('link', { name: /Kennenlernspiel/ })).toHaveAttribute(
      'href',
      '/app/schedule?date=2027-07-25&id=Kennenlernspiel',
    );
  });

  it('shows the start once, in the time column, and the end on the card', () => {
    renderList([entry('Kennenlernspiel', '15:45 - 17:45', { kind: 'program' })]);

    expect(screen.getAllByText('15:45')).toHaveLength(1);
    expect(screen.getByText(/bis 17:45 · 2 h/)).toBeInTheDocument();
  });

  it('shows meals and fixed points as lines that open nothing, and a transfer on the rail', () => {
    renderList([
      entry('Tagwache', '07:30 - 07:30', { kind: 'fixpoint' }),
      entry('Essen', '08:00 - 09:00', { kind: 'meal' }),
      entry('Verschiebung', '09:00 - 09:30', { kind: 'transfer' }),
      entry('Lageraufbau', '09:30 - 11:00', {
        kind: 'fixpoint',
        location: { id: 'platz', title: 'Lagerplatz' } as never,
      }),
    ]);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('07:30')).toBeInTheDocument();
    expect(screen.queryByText('bis 07:30')).toBeNull();
    expect(screen.getByText('bis 09:00')).toBeInTheDocument();
    expect(screen.getByText('30 min Verschiebung → Lagerplatz')).toBeInTheDocument();
    expect(screen.queryByText('Verschiebung')).toBeNull();
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
    const block = entry('Turnierformen', '13:45 - 15:45', { quartiere: [q(1), q(3)] });

    renderList([block]);
    expect(screen.queryByText('Q1')).toBeNull();
  });

  it('shows the slots of one block as one card, the own slot first in line to open', () => {
    renderList(
      [
        entry('Ballspiele', '17:00 - 17:30', { quartiere: [q(4), q(5), q(6)] }),
        { ...entry('Ballspiele', '17:00 - 18:00', { quartiere: [q(7), q(8)] }), id: 'other' },
      ],
      { groupSlots: true, myQuartierIds: new Set(['q5']) },
    );

    expect(screen.getAllByRole('heading', { name: 'Ballspiele' })).toHaveLength(1);
    expect(screen.getByText('17:00–17:30')).toBeInTheDocument();
    expect(screen.getByText('17:00–18:00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ballspiele/ })).toHaveAttribute(
      'href',
      '/app/schedule?date=2027-07-25&id=Ballspiele',
    );
  });

  it('marks what is running and draws the line of now through it', () => {
    renderList([entry('Ballspiele', '17:00 - 17:30')], {
      now: { dayKey: '2027-07-25', minutes: 17 * 60 + 12 },
    });

    expect(screen.getByText('Läuft · noch 18 min')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jetzt, 17:12' })).toBeInTheDocument();
  });

  it('stars the block from its card', () => {
    const onToggleStar = jest.fn();
    renderList([entry('Ballspiele', '17:00 - 17:30')], { onToggleStar });

    fireEvent.click(screen.getByRole('button', { name: 'Zu Favoriten hinzufügen' }));
    expect(onToggleStar).toHaveBeenCalledWith('Ballspiele');
  });

  it('unstars a grouped block whichever of its slots was starred', () => {
    const onToggleStar = jest.fn();
    renderList(
      [
        entry('Ballspiele', '17:00 - 17:30', { quartiere: [q(5)] }),
        { ...entry('Ballspiele', '17:00 - 18:00', { quartiere: [q(7)] }), id: 'other' },
      ],
      {
        groupSlots: true,
        myQuartierIds: new Set(['q5']),
        starredIds: new Set(['other']),
        onToggleStar,
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aus Favoriten entfernen' }));
    expect(onToggleStar).toHaveBeenCalledTimes(1);
    expect(onToggleStar).toHaveBeenCalledWith('other');
  });

  it('keeps an enrolled block a favourite', () => {
    renderList([entry('Ballspiele', '17:00 - 17:30')], {
      enrolledIds: new Set(['Ballspiele']),
      starredIds: new Set(['Ballspiele']),
    });

    expect(screen.getByRole('button', { pressed: true })).toBeDisabled();
  });
});
