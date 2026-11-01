/**
 * @jest-environment jsdom
 */

const mapConstructor = jest.fn();
const removeMock = jest.fn();
const resizeMock = jest.fn();
const addControlMock = jest.fn();
const setWorkerUrlMock = jest.fn();

jest.mock('maplibre-gl', () => ({
  Map: jest.fn().mockImplementation((options: unknown) => {
    mapConstructor(options);
    return { addControl: addControlMock, remove: removeMock, resize: resizeMock, on: jest.fn() };
  }),
  AttributionControl: jest.fn().mockImplementation(() => ({})),
  getVersion: (): string => '6.13.0',
  setWorkerUrl: (url: string): void => {
    setWorkerUrlMock(url);
  },
}));

import { useMapInitialization } from '@/features/map/hooks/use-map-initialization';
import { render, renderHook } from '@testing-library/react';
import { Map as MapLibre } from 'maplibre-gl';
import type React from 'react';
import { Activity, useState } from 'react';

const options = {
  initialMapPose: { initialMapCenter: [8.5, 47.4] as [number, number], zoom: 15 },
  limitUsage: true,
  validateStyle: true,
  locale: 'de' as const,
};

/** Renders its own container, as the map renderer does, so React owns when it leaves the page. */
const MapHost: React.FC = () => {
  const [container, setContainer] = useState<HTMLDivElement | undefined>();
  useMapInitialization(container, options);
  return <div ref={(element) => setContainer(element ?? undefined)} />;
};

const Page: React.FC<{ mode: 'visible' | 'hidden' }> = ({ mode }) => (
  <Activity mode={mode}>
    <MapHost />
  </Activity>
);

describe('useMapInitialization', () => {
  let container: HTMLDivElement;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    container.remove();
    warnSpy.mockRestore();
  });

  it('returns the map instance when initialization succeeds', () => {
    const { result } = renderHook(() => useMapInitialization(container, options));

    expect(result.current.initializationFailed).toBe(false);
    expect(result.current.map).toBeDefined();
    expect(addControlMock).toHaveBeenCalledTimes(1);
    // MapLibre's own labels speak the language of the app
    const [[mapOptions]] = mapConstructor.mock.calls as [[{ locale: Record<string, string> }]];
    expect(mapOptions.locale['Map.Title']).toBe('Karte');
  });

  it('points MapLibre at the worker built for its own version before creating the map', () => {
    renderHook(() => useMapInitialization(container, options));

    expect(setWorkerUrlMock).toHaveBeenCalledWith('/maplibre-gl-worker-6.13.0.js');
    expect(setWorkerUrlMock.mock.invocationCallOrder[0]).toBeLessThan(
      mapConstructor.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('reports failure instead of throwing when no WebGL context is available', () => {
    (MapLibre as unknown as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Failed to initialize WebGL');
    });

    const { result } = renderHook(() => useMapInitialization(container, options));

    expect(result.current.initializationFailed).toBe(true);
    expect(result.current.map).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('does not initialize a map without a container', () => {
    const { result } = renderHook(() => useMapInitialization(undefined, options));

    expect(result.current.initializationFailed).toBe(false);
    expect(result.current.map).toBeUndefined();
    expect(mapConstructor).not.toHaveBeenCalled();
  });

  it('removes the map when its page unmounts', () => {
    const { unmount } = render(<MapHost />);

    unmount();

    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the map while the page is hidden and shows the same one on return', () => {
    const { rerender } = render(<Page mode="visible" />);

    rerender(<Page mode="hidden" />);
    rerender(<Page mode="visible" />);
    rerender(<Page mode="hidden" />);
    rerender(<Page mode="visible" />);

    expect(mapConstructor).toHaveBeenCalledTimes(1);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('measures a map again when its page is shown', () => {
    const width = jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
    const { rerender } = render(<Page mode="visible" />);

    rerender(<Page mode="hidden" />);
    rerender(<Page mode="visible" />);

    expect(resizeMock).toHaveBeenCalledTimes(1);
    width.mockRestore();
  });

  it('removes a hidden map once its page is dropped and another map initializes', () => {
    const hidden = render(<Page mode="visible" />);
    hidden.rerender(<Page mode="hidden" />);
    // the page leaves the document without running the cleanup a second time
    hidden.unmount();
    expect(removeMock).not.toHaveBeenCalled();

    render(<MapHost />);

    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});
