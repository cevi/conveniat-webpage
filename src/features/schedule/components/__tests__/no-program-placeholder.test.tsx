/**
 * @jest-environment jsdom
 */

import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { NoProgramPlaceholder } from '@/features/schedule/components/no-program-placeholder';
import { noFilters } from '@/features/schedule/utils/schedule-filters';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-i18n-router/client', () => ({ useCurrentLocale: (): string => 'de' }));

const spielwiese = { id: 'place-1', title: 'Spielwiese Mitte' } as CampMapAnnotation;

describe('NoProgramPlaceholder', () => {
  it('names the place that emptied the day and offers all places back', () => {
    const onFiltersChange = jest.fn();
    render(
      <NoProgramPlaceholder
        filters={{ ...noFilters, selectedLocations: [spielwiese] }}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(screen.getByText('Nichts an «Spielwiese Mitte» an diesem Tag')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Alle Orte' }));
    expect(onFiltersChange).toHaveBeenCalledWith(noFilters);
  });

  it('treats a search of only spaces as no search', () => {
    render(
      <NoProgramPlaceholder
        filters={{ ...noFilters, searchText: '   ' }}
        onFiltersChange={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers to reset everything when the place and a search empty the day together', () => {
    const onFiltersChange = jest.fn();
    render(
      <NoProgramPlaceholder
        filters={{ ...noFilters, searchText: 'Ritter', selectedLocations: [spielwiese] }}
        onFiltersChange={onFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onFiltersChange).toHaveBeenCalledWith(noFilters);
  });

  it('names the time of day that emptied the day and offers the whole day back', () => {
    const onFiltersChange = jest.fn();
    render(
      <NoProgramPlaceholder
        filters={{ ...noFilters, timesOfDay: ['evening'] }}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(screen.getByText('Nichts am Abend an diesem Tag')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ganzen Tag anzeigen' }));
    expect(onFiltersChange).toHaveBeenCalledWith(noFilters);
  });

  it('says a day holds only logistics when they are hidden, and shows them again', () => {
    const onFiltersChange = jest.fn();
    render(
      <NoProgramPlaceholder
        filters={{ ...noFilters, showLogistics: false }}
        onFiltersChange={onFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anreise & Essen anzeigen' }));
    expect(onFiltersChange).toHaveBeenCalledWith(noFilters);
  });
});
