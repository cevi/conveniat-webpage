/**
 * @jest-environment jsdom
 */

import { useLongPress } from '@/features/chat/hooks/use-long-press';
import { act, renderHook } from '@testing-library/react';
import type React from 'react';

const touch = (x = 0, y = 0): React.PointerEvent =>
  ({ pointerType: 'touch', clientX: x, clientY: y }) as React.PointerEvent;

const mouseEvent = (): React.MouseEvent & { prevented: () => boolean } => {
  let prevented = false;
  return {
    preventDefault: () => {
      prevented = true;
    },
    stopPropagation: () => {},
    prevented: () => prevented,
  } as unknown as React.MouseEvent & { prevented: () => boolean };
};

const key = (init: Partial<React.KeyboardEvent>): React.KeyboardEvent =>
  ({ preventDefault: () => {}, shiftKey: false, ...init }) as React.KeyboardEvent;

describe('useLongPress', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens after a finger rests on the row and swallows the tap that ends the press', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(touch()));
    act(() => jest.advanceTimersByTime(449));
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledTimes(1);

    const click = mouseEvent();
    act(() => result.current.onClickCapture(click));
    expect(click.prevented()).toBe(true);
  });

  it('also swallows that tap where it lands on what the press opened, and only that one', () => {
    const { result } = renderHook(() => useLongPress(jest.fn()));
    const closeButton = document.createElement('button');
    const onClose = jest.fn();
    closeButton.addEventListener('click', onClose);
    document.body.append(closeButton);

    act(() => result.current.onPointerDown(touch()));
    act(() => jest.advanceTimersByTime(450));
    document.dispatchEvent(new Event('pointerup'));
    closeButton.click();
    expect(onClose).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1000));
    closeButton.click();
    expect(onClose).toHaveBeenCalledTimes(1);
    closeButton.remove();
  });

  it('lets the next tap through after a press that ended in none', () => {
    const { result } = renderHook(() => useLongPress(jest.fn()));
    const button = document.createElement('button');
    const onClick = jest.fn();
    button.addEventListener('click', onClick);
    document.body.append(button);

    act(() => result.current.onPointerDown(touch()));
    act(() => jest.advanceTimersByTime(450));
    document.dispatchEvent(new Event('pointercancel'));
    act(() => jest.advanceTimersByTime(1000));
    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    button.remove();
  });

  it('lets a short tap through', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(touch()));
    act(() => result.current.onPointerUp());
    act(() => jest.advanceTimersByTime(1000));
    const click = mouseEvent();
    act(() => result.current.onClickCapture(click));

    expect(onLongPress).not.toHaveBeenCalled();
    expect(click.prevented()).toBe(false);
  });

  it('gives way to a scroll or a swipe', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(touch(0, 0)));
    act(() => result.current.onPointerMove(touch(0, 11)));
    act(() => jest.advanceTimersByTime(1000));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('opens on the context-menu key and on Shift+F10', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onKeyDown(key({ key: 'ContextMenu' })));
    act(() => result.current.onKeyDown(key({ key: 'F10', shiftKey: true })));
    act(() => result.current.onKeyDown(key({ key: 'Enter' })));

    expect(onLongPress).toHaveBeenCalledTimes(2);
  });

  it('opens on a right click instead of the browser menu', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));
    const contextMenu = mouseEvent();

    act(() => result.current.onContextMenu(contextMenu));

    expect(contextMenu.prevented()).toBe(true);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});
