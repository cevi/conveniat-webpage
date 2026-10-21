/**
 * @jest-environment jsdom
 */

import { DateCarousel } from '@/features/schedule/components/date-carousel';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

const dates = [25, 26, 27, 28, 29, 30].map((day) => new Date(Date.UTC(2027, 6, day, 12)));

// jsdom lays nothing out: give every day 60 px and the strip room for five of them
const dayWidth = 60;
const scrollTo = jest.fn();
const scrollBy = jest.fn();

beforeAll(() => {
  Object.defineProperties(HTMLElement.prototype, {
    offsetWidth: { configurable: true, get: (): number => dayWidth },
    offsetLeft: {
      configurable: true,
      get(this: HTMLElement): number {
        return [...(this.parentElement?.children ?? [])].indexOf(this) * dayWidth;
      },
    },
    clientWidth: { configurable: true, get: (): number => 5 * dayWidth },
    scrollWidth: {
      configurable: true,
      get(this: HTMLElement): number {
        return this.children.length * dayWidth;
      },
    },
  });
  Object.assign(HTMLElement.prototype, { scrollTo, scrollBy });
});

beforeEach(() => {
  scrollTo.mockClear();
  scrollBy.mockClear();
});

const renderCarousel = (currentDate: Date, onDateSelect = jest.fn()): void => {
  render(<DateCarousel allDates={dates} currentDate={currentDate} onDateSelect={onDateSelect} />);
};

describe('DateCarousel', () => {
  it('renders every day, so a swipe brings in days that are already there', () => {
    renderCarousel(dates[1] as Date);

    const days = screen.getAllByRole('button', { pressed: false });
    expect(days).toHaveLength(5);
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('26');
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('selects the day that is tapped', () => {
    const onDateSelect = jest.fn();
    renderCarousel(dates[1] as Date, onDateSelect);

    fireEvent.click(screen.getByText('27'));
    expect(onDateSelect).toHaveBeenCalledWith(dates[2]);
  });

  it('scrolls by one day with the arrows, and only where there is more to see', () => {
    renderCarousel(dates[0] as Date);

    expect(screen.getByLabelText('Vorheriger Tag')).toBeDisabled();
    const next = screen.getByLabelText('Nächster Tag');
    expect(next).not.toBeDisabled();

    fireEvent.click(next);
    expect(scrollBy).toHaveBeenCalledWith({ left: dayWidth, behavior: 'smooth' });
  });

  it('opens on a selected day that lies beyond the first five, without sliding there', () => {
    renderCarousel(dates[5] as Date);

    expect(scrollTo).toHaveBeenCalledWith({ left: dayWidth, behavior: 'instant' });
  });
});
