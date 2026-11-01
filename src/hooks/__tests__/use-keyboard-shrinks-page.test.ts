/**
 * @jest-environment jsdom
 */
import { useKeyboardShrinksPage } from '@/hooks/use-keyboard-shrinks-page';
import { act, renderHook } from '@testing-library/react';

const resizeTo = (width: number, height: number): void => {
  Object.defineProperty(globalThis, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(globalThis, 'innerHeight', { value: height, configurable: true });
  globalThis.dispatchEvent(new Event('resize'));
};

describe('useKeyboardShrinksPage', () => {
  beforeEach(() => resizeTo(412, 997));

  it('is true while the keyboard shrinks the page and false once it closes', () => {
    const { result } = renderHook(() => useKeyboardShrinksPage());
    expect(result.current).toBe(false);

    act(() => resizeTo(412, 641));
    expect(result.current).toBe(true);

    act(() => resizeTo(412, 997));
    expect(result.current).toBe(false);
  });

  it('ignores a browser address bar that hides and shows', () => {
    const { result } = renderHook(() => useKeyboardShrinksPage());

    act(() => resizeTo(412, 941));
    expect(result.current).toBe(false);
  });

  it('starts over when the phone is turned', () => {
    const { result } = renderHook(() => useKeyboardShrinksPage());

    act(() => resizeTo(997, 412));
    expect(result.current).toBe(false);

    act(() => resizeTo(997, 180));
    expect(result.current).toBe(true);
  });
});
