/**
 * @jest-environment jsdom
 */

import { DateSlotSelection } from '@/features/payload-cms/components/form/date-slot-selection';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { FieldValues } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

/** Renders the block in a real form and prints the field value the submission would carry. */
const Harness: React.FC<{ maxRanges?: number; asksForRessort?: boolean; endDate?: string }> = ({
  maxRanges,
  asksForRessort,
  endDate = '2027-08-06T00:00:00.000Z',
}) => {
  const { control } = useForm<FieldValues>({ defaultValues: { slots: '' } });
  const slots = useWatch({ control, name: 'slots' }) as string;
  return (
    <>
      <DateSlotSelection
        blockType="dateSlotSelection"
        control={control}
        name="slots"
        label="Verfügbarkeit"
        startDate="2027-07-12T00:00:00.000Z"
        endDate={endDate}
        minDays={3}
        maxRanges={maxRanges}
        ressortName={asksForRessort === true ? 'ressortwunsch' : undefined}
        ressortLabel="In welchem Bereich möchtest du am liebsten mithelfen?"
      />
      <output data-testid="value">{slots}</output>
    </>
  );
};

const day = (dayOfJuly: number): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`, ${dayOfJuly}\\. Juli 2027`) });

const tap = (...daysOfJuly: number[]): void => {
  for (const dayOfJuly of daysOfJuly) fireEvent.click(day(dayOfJuly));
};

const value = (): string => screen.getByTestId('value').textContent ?? '';

describe('DateSlotSelection', () => {
  it('replaces the only slot when a single one is allowed', () => {
    render(<Harness />);

    tap(12, 14);
    expect(value()).toBe('2027-07-12 – 2027-07-14');

    tap(20);
    expect(value()).toBe('');
    tap(22);
    expect(value()).toBe('2027-07-20 – 2027-07-22');
  });

  it('keeps the first slot while the second one is picked, and stores both earliest first', () => {
    render(<Harness maxRanges={2} />);

    tap(20, 22);
    tap(12);
    expect(value()).toBe('2027-07-20 – 2027-07-22');

    tap(14);
    expect(value()).toBe('2027-07-12 – 2027-07-14, 2027-07-20 – 2027-07-22');
  });

  it('offers no day that would make the second slot touch or overlap the first', () => {
    render(<Harness maxRanges={2} />);

    tap(12, 14);
    // Starting on the 15th or 16th leaves no free day between the slots.
    expect(day(13)).toBeDisabled();
    expect(day(15)).toBeDisabled();
    expect(day(16)).toBeEnabled();

    tap(20);
    expect(day(21)).toBeDisabled();
    expect(day(22)).toBeEnabled();
  });

  it('starts over once both slots are marked', () => {
    render(<Harness maxRanges={2} />);

    tap(12, 14, 20, 22, 25);
    expect(value()).toBe('');

    tap(27);
    expect(value()).toBe('2027-07-25 – 2027-07-27');
  });

  it('offers only the areas that also have jobs', () => {
    render(<Harness asksForRessort />);

    const labels = screen
      .getAllByRole('option')
      .filter((option) => (option as HTMLOptionElement).value !== '')
      .map((option) => option.textContent);

    expect(labels).toEqual([
      'Aufbau & Infrastruktur',
      'Programm & Events',
      'Kommunikation & Marketing',
      'Küche & Verpflegung',
      'Logistik & Transport',
    ]);
  });

  it('names the camp phase of each day and lists the phases in the window', () => {
    render(<Harness />);

    expect(day(23)).toHaveAccessibleName(/23\. Juli 2027, Aufbaulager$/);
    expect(day(24)).toHaveAccessibleName(/24\. Juli 2027, Hauptlager$/);
    expect(
      screen.getByRole('button', { name: /, 3\. August 2027, Abbaulager$/ }),
    ).toBeInTheDocument();

    const legend = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(legend).toEqual([
      'Aufbaulager12.07. – 23.07.',
      'Hauptlager24.07. – 02.08.',
      'Abbaulager03.08. – 15.08.',
    ]);
  });

  it('leaves out the phases a window does not reach', () => {
    render(<Harness endDate="2027-07-20T00:00:00.000Z" />);

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Aufbaulager12.07. – 23.07.',
    ]);
  });

  it('removes one slot and leaves the other', () => {
    render(<Harness maxRanges={2} />);

    tap(12, 14, 20, 22);
    fireEvent.click(screen.getByRole('button', { name: /^Zeitfenster entfernen: .*12\.07\.2027/ }));
    expect(value()).toBe('2027-07-20 – 2027-07-22');

    fireEvent.click(screen.getByRole('button', { name: /^Zeitfenster entfernen/ }));
    expect(value()).toBe('');
  });
});
