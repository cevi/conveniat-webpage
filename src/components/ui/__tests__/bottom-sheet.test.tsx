/**
 * @jest-environment jsdom
 */

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-i18n-router/client', () => ({ useCurrentLocale: (): string => 'de' }));

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
});
