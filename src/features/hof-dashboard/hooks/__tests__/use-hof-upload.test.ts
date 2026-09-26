/**
 * @jest-environment jsdom
 */

import { useHofUpload } from '@/features/hof-dashboard/hooks/use-hof-upload';
import { trpc } from '@/trpc/client';
import { act, renderHook } from '@testing-library/react';

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    hofDashboard: {
      createUploadUrl: { useMutation: jest.fn() },
      completeUpload: { useMutation: jest.fn() },
    },
  },
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const createUploadUrl = jest.fn();
const completeUpload = jest.fn();
const opened = jest.fn();

/** An XMLHttpRequest that records being opened and finishes the moment it is sent. */
class FakeRequest extends EventTarget {
  public status = 200;
  public upload = new EventTarget();
  public open(): void {
    opened();
  }
  public setRequestHeader(): void {}
  public send(): void {
    this.dispatchEvent(new Event('load'));
  }
  public abort(): void {
    this.dispatchEvent(new Event('abort'));
  }
}

const pdf = new File(['%PDF-1.4 plan'], 'Plan.pdf', { type: 'application/pdf' });

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.XMLHttpRequest = FakeRequest as unknown as typeof XMLHttpRequest;
  (trpc.useUtils as unknown as jest.Mock).mockReturnValue({
    hofDashboard: { getHofDashboard: { invalidate: jest.fn() } },
  });
  jest
    .mocked(trpc.hofDashboard.createUploadUrl.useMutation)
    .mockReturnValue({ mutateAsync: createUploadUrl } as never);
  jest
    .mocked(trpc.hofDashboard.completeUpload.useMutation)
    .mockReturnValue({ mutateAsync: completeUpload } as never);
  completeUpload.mockResolvedValue({});
});

describe('useHofUpload', () => {
  it('files an upload once it is up', async () => {
    createUploadUrl.mockResolvedValue({ url: 'https://s3/put', key: 'k', contentType: 'x' });
    const { result } = renderHook(() => useHofUpload('hof-nord', 'de'));
    await act(() => result.current.upload(pdf, 'hofBuildings', 'plan'));
    expect(opened).toHaveBeenCalled();
    expect(completeUpload).toHaveBeenCalledWith(expect.objectContaining({ filename: 'Plan.pdf' }));
  });

  it('files nothing when cancelled before the transfer starts', async () => {
    const url = Promise.withResolvers<unknown>();
    createUploadUrl.mockReturnValue(url.promise);
    const { result } = renderHook(() => useHofUpload('hof-nord', 'de'));

    let running: Promise<void> = Promise.resolve();
    act(() => {
      running = result.current.upload(pdf, 'hofBuildings', 'plan');
    });
    act(() => result.current.uploads['hofBuildings:plan']?.cancel?.());
    // the card is back at its button at once
    expect(result.current.uploads['hofBuildings:plan']).toBeUndefined();

    await act(async () => {
      url.resolve({ url: 'https://s3/put', key: 'k', contentType: 'x' });
      await running;
    });
    expect(opened).not.toHaveBeenCalled();
    expect(completeUpload).not.toHaveBeenCalled();
  });

  it('keeps showing a new upload started right after a cancel', async () => {
    const firstUrl = Promise.withResolvers<unknown>();
    const secondUrl = Promise.withResolvers<unknown>();
    createUploadUrl.mockReturnValueOnce(firstUrl.promise).mockReturnValueOnce(secondUrl.promise);
    const { result } = renderHook(() => useHofUpload('hof-nord', 'de'));

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.upload(pdf, 'hofBuildings', 'plan');
    });
    await act(() => new Promise((done) => setTimeout(done, 0)));
    act(() => result.current.uploads['hofBuildings:plan']?.cancel?.());
    act(() => {
      void result.current.upload(pdf, 'hofBuildings', 'plan');
    });
    await act(() => new Promise((done) => setTimeout(done, 0)));

    // the cancelled one ends now; the second must stay on the card
    await act(async () => {
      firstUrl.resolve({ url: 'https://s3/put', key: 'k', contentType: 'x' });
      await first;
    });
    expect(result.current.uploads['hofBuildings:plan']).toBeDefined();
  });
});
