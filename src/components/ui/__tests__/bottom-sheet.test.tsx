/**
 * @jest-environment jsdom
 */

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { createRef, useState } from 'react';

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));

/** A window of the given width, as the desktop check reads it. */
const windowOf = (width: number): void => {
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query === '(min-width: 1280px)' && width >= 1280,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
};

const SheetWithOpener: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Teilnehmende hinzufügen
      </button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Teilnehmende hinzufügen">
        <input aria-label="Suche" />
      </BottomSheet>
    </>
  );
};

/** Opens the sheet from its button and returns what `focus` was called with on the way back. */
const focusOptionsOnReturn = async (close: (dialog: HTMLElement) => void): Promise<unknown> => {
  render(<SheetWithOpener />);
  const opener = screen.getByRole('button', { name: 'Teilnehmende hinzufügen' });
  act(() => opener.focus());
  fireEvent.click(opener);
  const dialog = screen.getByRole('dialog');
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Suche' }), { key: 'a' });
  const focus = jest.spyOn(opener, 'focus');
  close(dialog);
  await waitFor(() => expect(document.activeElement).toBe(opener));
  return focus.mock.calls.at(-1)?.[0];
};

describe('BottomSheet', () => {
  it('is a named dialog that closes with its ✕', () => {
    const onOpenChange = jest.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="Filter">
        <p>Kategorie</p>
      </BottomSheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Filter' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Schliessen' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes with Escape', () => {
    const onOpenChange = jest.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="Profilbild" showClose={false}>
        <p>Foto aufnehmen</p>
      </BottomSheet>,
    );

    expect(screen.queryByRole('button', { name: 'Schliessen' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('hands focus back without a ring after a tap, even after typing in it', async () => {
    const options = await focusOptionsOnReturn(() => {
      const close = screen.getByRole('button', { name: 'Schliessen' });
      fireEvent.pointerDown(close);
      fireEvent.click(close);
    });
    expect(options).toEqual(expect.objectContaining({ focusVisible: false }));
  });

  it('hands focus back with a ring after Escape', async () => {
    const options = await focusOptionsOnReturn((dialog) => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    expect(options).toEqual(expect.objectContaining({ focusVisible: true }));
  });

  describe('with an anchor', () => {
    const renderAnchored = (): HTMLButtonElement => {
      const anchor = createRef<HTMLButtonElement>();
      render(
        <>
          <button ref={anchor} type="button">
            Excel-Export
          </button>
          <BottomSheet open onOpenChange={jest.fn()} title="Excel-Export" anchor={anchor}>
            <p>Tabellenblätter</p>
          </BottomSheet>
        </>,
      );
      const button = anchor.current;
      if (button === null) throw new Error('no anchor');
      return button;
    };

    afterEach(() => {
      Reflect.deleteProperty(globalThis, 'matchMedia');
    });

    it('opens as a popup under its button on a desktop, the same dialog without a grabber', () => {
      windowOf(1440);
      Object.defineProperty(globalThis, 'innerHeight', { configurable: true, value: 1000 });
      Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: 1440 });
      jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 144,
        right: 1300,
      } as DOMRect);
      renderAnchored();

      const dialog = screen.getByRole('dialog', { name: 'Excel-Export' });
      expect(dialog).toHaveStyle({ top: '152px', right: '140px' });
      expect(dialog.querySelector('.bg-rail')).toBeNull();
    });

    it('stays a sheet from the bottom on a phone', () => {
      windowOf(390);
      renderAnchored();

      const dialog = screen.getByRole('dialog', { name: 'Excel-Export' });
      expect(dialog).toHaveClass('bottom-[var(--visual-viewport-bottom,0px)]');
      expect(dialog.querySelector('.bg-rail')).not.toBeNull();
    });
  });
});
