/**
 * @jest-environment jsdom
 */

const mapConstructor = jest.fn();
const removeMock = jest.fn();
const addControlMock = jest.fn();

jest.mock('maplibre-gl', () => ({
  Map: jest.fn().mockImplementation((options: unknown) => {
    mapConstructor(options);
    return { addControl: addControlMock, remove: removeMock };
  }),
  AttributionControl: jest.fn().mockImplementation(() => ({})),
}));

import { useMapInitialization } from '@/features/map/hooks/use-map-initialization';
import { renderHook } from '@testing-library/react';
import { Map as MapLibre } from 'maplibre-gl';

const options = {
  initialMapPose: { initialMapCenter: [8.5, 47.4] as [number, number], zoom: 15 },
  limitUsage: true,
  validateStyle: true,
};

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

  it('removes the map instance on unmount', () => {
    const { unmount } = renderHook(() => useMapInitialization(container, options));

    unmount();

    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});
