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

const setReminder = jest.fn();
let isReminderOn = false;
jest.mock('@/features/schedule/hooks/use-reminder', () => ({
  useReminder: (): unknown => ({ isOn: isReminderOn, isAutomatic: false, setReminder }),
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

  it('shows the start and the end once, in the time column, and how long on the card', () => {
    renderList([entry('Kennenlernspiel', '15:45 - 17:45', { kind: 'program' })]);

    expect(screen.getAllByText('15:45')).toHaveLength(1);
    expect(screen.getAllByText('17:45')).toHaveLength(1);
    expect(screen.getByText('2 h')).toBeInTheDocument();
    expect(screen.queryByText(/bis 17:45/)).toBeNull();
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
    // a fixed point that has no length shows its time once
    expect(screen.getAllByText('07:30')).toHaveLength(1);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText(/^bis /)).toBeNull();
    // short on screen, in words for a screen reader
    expect(screen.getByText('30′ → Lagerplatz')).toBeInTheDocument();
    expect(screen.getByText('30 min Verschiebung → Lagerplatz')).toBeInTheDocument();
    expect(screen.queryByText('Verschiebung')).toBeNull();
    // the walk ends when the next stop starts: no time left over
    expect(screen.queryByText(/frei$/)).toBeNull();
  });

  it('says how much time is left after a walk', () => {
    renderList([
      entry('Essen', '08:00 - 09:00', { kind: 'meal' }),
      entry('Verschiebung', '09:00 - 09:15', { kind: 'transfer' }),
      entry('Lageraufbau', '09:30 - 11:00', { kind: 'program' }),
    ]);

    expect(screen.getByText('15′ frei')).toBeInTheDocument();
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

  it('marks what is running and draws the line of now after it, before what comes next', () => {
    renderList(
      [entry('Ballspiele', '17:00 - 17:30'), entry('Essen', '17:30 - 18:00', { kind: 'meal' })],
      { now: { dayKey: '2027-07-25', minutes: 17 * 60 + 12 } },
    );

    expect(screen.getByText('Läuft · noch 18 min')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    const lineAt = items.findIndex((item) => item.querySelector('[aria-label="Jetzt, 17:12"]'));
    expect(items[lineAt - 1]).toHaveTextContent('Ballspiele');
    expect(items[lineAt + 1]).toHaveTextContent('Essen');
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

  it('asks about the reminder before taking the star off, as the block page does', () => {
    isReminderOn = true;
    const onToggleStar = jest.fn();
    renderList([entry('Ballspiele', '17:00 - 17:30')], {
      starredIds: new Set(['Ballspiele']),
      onToggleStar,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aus Favoriten entfernen' }));
    expect(onToggleStar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ja, entfernen' }));
    expect(onToggleStar).toHaveBeenCalledWith('Ballspiele');
    expect(setReminder).toHaveBeenCalledWith(false);
    isReminderOn = false;
  });

  it('keeps an enrolled block a favourite', () => {
    renderList([entry('Ballspiele', '17:00 - 17:30')], {
      enrolledIds: new Set(['Ballspiele']),
      starredIds: new Set(['Ballspiele']),
    });

    expect(screen.getByRole('button', { pressed: true })).toBeDisabled();
  });
});
