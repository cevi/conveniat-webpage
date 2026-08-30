/**
 * @jest-environment jsdom
 */

import { ShiftShareButton } from '@/features/schedule/components/shift-share-button';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch' },
}));

const EXPECTED_URL = 'https://conveniat27.ch/app/helper-portal?id=shift-1';

const renderButton = (): void => {
  render(<ShiftShareButton shiftId="shift-1" shiftTitle="Küchendienst" locale="de" />);
};

const setNavigator = (value: Partial<Navigator>): void => {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true,
  });
};

describe('ShiftShareButton', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hands the shift URL to the share sheet where there is one', async () => {
    const share = jest.fn(async (): Promise<void> => {});
    const writeText = jest.fn();
    setNavigator({ share, clipboard: { writeText } as unknown as Clipboard });

    renderButton();
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: EXPECTED_URL }));
    // the sheet took it: copying on top of that would be a second, silent action
    expect(writeText).not.toHaveBeenCalled();
  });

  /**
   * Dismissing the share sheet rejects exactly like a failure does. Copying the link there would
   * put a URL the helper had just decided not to send onto their clipboard.
   */
  it('does not copy when the share sheet is dismissed', async () => {
    const share = jest.fn().mockRejectedValue(new Error('AbortError'));
    const writeText = jest.fn();
    setNavigator({ share, clipboard: { writeText } as unknown as Clipboard });

    renderButton();
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link and confirms it where there is no share sheet', async () => {
    const writeText = jest.fn(async (): Promise<void> => {});
    setNavigator({ clipboard: { writeText } as unknown as Clipboard });

    renderButton();
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(EXPECTED_URL));
    expect(await screen.findByText('Link kopiert')).toBeInTheDocument();
  });
});
