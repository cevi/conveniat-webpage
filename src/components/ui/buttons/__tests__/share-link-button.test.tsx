/**
 * @jest-environment jsdom
 */

import { ShareLinkButton } from '@/components/ui/buttons/share-link-button';
import { fireEvent, render, screen } from '@testing-library/react';

const setNavigator = (value: Partial<Navigator>): void => {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
};

const renderButton = (): void => {
  render(<ShareLinkButton url="https://conveniat27.ch/app/map" title="Bühne" locale="de" />);
};

describe('ShareLinkButton without a share sheet', () => {
  it('copies the link and says so', async () => {
    const writeText = jest.fn(async (): Promise<void> => {});
    setNavigator({ clipboard: { writeText } as unknown as Clipboard });

    renderButton();
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Link kopiert')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('https://conveniat27.ch/app/map');
  });

  it('says so when there is no clipboard to copy to', async () => {
    // outside a secure context the clipboard does not exist
    setNavigator({});

    renderButton();
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Link nicht kopiert')).toBeInTheDocument();
  });
});
