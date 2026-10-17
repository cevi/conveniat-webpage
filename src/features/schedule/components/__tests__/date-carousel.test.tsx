/**
 * @jest-environment jsdom
 */

import { DateCarousel } from '@/features/schedule/components/date-carousel';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

describe('DateCarousel', () => {
  const date0 = new Date('2027-07-25T12:00:00.000Z');
  const date1 = new Date('2027-07-26T12:00:00.000Z');
  const date2 = new Date('2027-07-27T12:00:00.000Z');
  const date3 = new Date('2027-07-28T12:00:00.000Z');
  const date4 = new Date('2027-07-29T12:00:00.000Z');
  const date5 = new Date('2027-07-30T12:00:00.000Z');
  const dates = [date0, date1, date2, date3, date4, date5];

  it('renders visible dates and indicates selected date', () => {
    const handleDateSelect = jest.fn();
    const handlePrevious = jest.fn();
    const handleNext = jest.fn();

    render(
      <DateCarousel
        allDates={dates}
        currentDate={date1}
        startIndex={0}
        maxVisible={5}
        onDateSelect={handleDateSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />,
    );

    const buttons = screen.getAllByRole('button');
    // Index 0 is Previous, buttons 1..5 are dates, Index 6 is Next
    expect(buttons).toHaveLength(7);

    // Selected date (date1 -> button 2) should have aria-pressed="true"
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');

    // Click an unselected date
    const targetButton = buttons[3];
    expect(targetButton).toBeDefined();
    if (targetButton) {
      fireEvent.click(targetButton);
    }
    expect(handleDateSelect).toHaveBeenCalledWith(date2);
  });

  it('handles navigation buttons and disabled states', () => {
    const handleDateSelect = jest.fn();
    const handlePrevious = jest.fn();
    const handleNext = jest.fn();

    const { rerender } = render(
      <DateCarousel
        allDates={dates}
        currentDate={date0}
        startIndex={0}
        maxVisible={5}
        onDateSelect={handleDateSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />,
    );

    const previousButton = screen.getByLabelText('Vorheriger Tag');
    const nextButton = screen.getByLabelText('Nächster Tag');

    expect(previousButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(handleNext).toHaveBeenCalledTimes(1);

    // Rerender at the end of the list
    rerender(
      <DateCarousel
        allDates={dates}
        currentDate={date5}
        startIndex={1}
        maxVisible={5}
        onDateSelect={handleDateSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />,
    );

    expect(previousButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();

    fireEvent.click(previousButton);
    expect(handlePrevious).toHaveBeenCalledTimes(1);
  });
});
