/**
 * @jest-environment jsdom
 */

jest.mock('maplibre-gl', () => ({
  LngLatBounds: jest.fn().mockImplementation(() => ({ extend: jest.fn().mockReturnThis() })),
}));

import { useFitToSearchResults } from '@/components/map/hooks/use-fit-to-search-results';
import { MapContextProvider } from '@/components/map/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint } from '@/components/map/types';
import { render } from '@testing-library/react';
import type { Map as MapLibre } from 'maplibre-gl';
import type React from 'react';
import { Activity } from 'react';

const place = (title: string): CampMapAnnotationPoint =>
  ({ id: title, title, geometry: { coordinates: [8.3, 46.5] } }) as CampMapAnnotationPoint;

const fitBounds = jest.fn();
const map = { fitBounds } as unknown as MapLibre;

const Search: React.FC<{ term: string; results: CampMapAnnotationPoint[] }> = ({
  term,
  results,
}) => {
  useFitToSearchResults(term, results);
  return <></>;
};

const Page: React.FC<{
  mode: 'visible' | 'hidden';
  term: string;
  results: CampMapAnnotationPoint[];
}> = ({ mode, term, results }) => (
  <MapContextProvider map={map}>
    <Activity mode={mode}>
      <Search term={term} results={results} />
    </Activity>
  </MapContextProvider>
);

describe('useFitToSearchResults', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fitBounds.mockClear();
    globalThis.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('moves the map to what a search found', () => {
    render(<Page mode="visible" term="Bühne" results={[place('Bühne')]} />);
    jest.runAllTimers();

    expect(fitBounds).toHaveBeenCalledTimes(1);
  });

  it('stays where the user is when the results are refreshed or the page is shown again', () => {
    const { rerender } = render(<Page mode="visible" term="Bühne" results={[place('Bühne')]} />);
    jest.runAllTimers();

    rerender(<Page mode="visible" term="Bühne" results={[place('Bühne')]} />);
    jest.runAllTimers();
    rerender(<Page mode="hidden" term="Bühne" results={[place('Bühne')]} />);
    rerender(<Page mode="visible" term="Bühne" results={[place('Bühne')]} />);
    jest.runAllTimers();

    expect(fitBounds).toHaveBeenCalledTimes(1);
  });

  it('moves the map again once the search changes', () => {
    const { rerender } = render(<Page mode="visible" term="Bühne" results={[place('Bühne')]} />);
    jest.runAllTimers();

    rerender(<Page mode="visible" term="Infostand" results={[place('Infostand')]} />);
    jest.runAllTimers();

    expect(fitBounds).toHaveBeenCalledTimes(2);
  });
});
