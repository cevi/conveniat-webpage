/**
 * @jest-environment jsdom
 */

import { useImageViewerHistory } from '@/features/chat/hooks/use-image-viewer-history';
import { act, renderHook, waitFor } from '@testing-library/react';

const IMAGE = 'chat-images/a.jpg';

/** jsdom fires popstate asynchronously, like a browser after the back gesture */
const goBack = async (): Promise<void> => {
  const popped = new Promise((resolve) =>
    globalThis.addEventListener('popstate', resolve, { once: true }),
  );
  globalThis.history.back();
  await popped;
};

describe('useImageViewerHistory', () => {
  beforeEach(() => globalThis.history.replaceState(undefined, '', '/app/chat/1'));

  it('closes the image on the back gesture and stays in the chat', async () => {
    const lengthBefore = globalThis.history.length;
    const { result } = renderHook(() => useImageViewerHistory(IMAGE));

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(globalThis.history.length).toBe(lengthBefore + 1);

    await act(goBack);
    expect(result.current.isOpen).toBe(false);
    expect(globalThis.location.pathname).toBe('/app/chat/1');
  });

  it('leaves the history entry when the close button closes the image', async () => {
    const { result } = renderHook(() => useImageViewerHistory(IMAGE));
    act(() => result.current.open());

    act(() => result.current.close());
    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(globalThis.history.state ?? undefined).toBeUndefined();
  });

  it('steps back once when the close button and the tap on the viewer both close it', async () => {
    const { result } = renderHook(() => useImageViewerHistory(IMAGE));
    act(() => result.current.open());
    // jsdom merges two steps back in one task into one; Chrome takes both and leaves the chat
    const back = jest.spyOn(globalThis.history, 'back');

    act(() => {
      result.current.close();
      result.current.close();
    });
    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it('shows a chat that comes back with the image closed', () => {
    const { result, unmount } = renderHook(() => useImageViewerHistory(IMAGE));
    act(() => result.current.open());
    unmount();

    // the chat was left through a navigation of its own and is now opened again
    globalThis.history.pushState(undefined, '', '/app/chat/1');
    const { result: again } = renderHook(() => useImageViewerHistory(IMAGE));
    expect(again.current.isOpen).toBe(false);
  });

  it('opens only the image that was tapped', () => {
    const { result: tapped } = renderHook(() => useImageViewerHistory(IMAGE));
    const { result: other } = renderHook(() => useImageViewerHistory('chat-images/b.jpg'));

    act(() => tapped.current.open());
    expect(tapped.current.isOpen).toBe(true);
    expect(other.current.isOpen).toBe(false);
  });
});
