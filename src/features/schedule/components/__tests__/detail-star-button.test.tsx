/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';

const toggleStar = jest.fn();
const setReminder = jest.fn();
let reminder = { isOn: true, isAutomatic: false };

jest.mock('next-i18n-router/client', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/hooks/use-star', () => ({
  useStar: (): unknown => ({ isStarred: (): boolean => true, toggleStar }),
}));
jest.mock('@/features/schedule/hooks/use-reminder', () => ({
  useReminder: (): unknown => ({ ...reminder, setReminder }),
}));
jest.mock('@/trpc/client', () => ({
  trpc: { schedule: { getMyEnrollments: { useQuery: (): unknown => ({ data: [] }) } } },
}));

import { DetailStarButton } from '@/features/schedule/components/detail-star-button';

const unstar = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Aus Favoriten entfernen' }));
};

describe('DetailStarButton and the reminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reminder = { isOn: true, isAutomatic: false };
  });

  it('asks before taking the star off a block with a reminder, and removes both on "Ja"', () => {
    render(<DetailStarButton entryId="slot-q5" />);
    unstar();

    expect(toggleStar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ja, entfernen' }));
    expect(toggleStar).toHaveBeenCalledWith('slot-q5');
    expect(setReminder).toHaveBeenCalledWith(false);
  });

  it('keeps the reminder on "Behalten" and takes only the star off', () => {
    render(<DetailStarButton entryId="slot-q5" />);
    unstar();
    fireEvent.click(screen.getByRole('button', { name: 'Behalten' }));

    expect(toggleStar).toHaveBeenCalledWith('slot-q5');
    expect(setReminder).not.toHaveBeenCalled();
  });

  it('takes the star off at once when there is no reminder to ask about', () => {
    reminder = { isOn: false, isAutomatic: false };
    render(<DetailStarButton entryId="slot-q5" />);
    unstar();

    expect(toggleStar).toHaveBeenCalledWith('slot-q5');
    expect(screen.queryByText('Erinnerung auch entfernen?')).toBeNull();
  });
});
