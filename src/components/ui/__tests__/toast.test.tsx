/**
 * @jest-environment jsdom
 */

import { toast, Toaster } from '@/components/ui/toast';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

describe('toast', () => {
  beforeEach(() => {
    act(() => {
      toast.dismiss();
    });
  });

  it('announces an error at once and closes after its action was used', async () => {
    const tryAgain = jest.fn();
    render(<Toaster locale="de" />);

    act(() => {
      toast.error('Chat konnte nicht gelöscht werden.', {
        action: { label: 'Nochmals', onClick: tryAgain },
      });
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Chat konnte nicht gelöscht werden.');

    fireEvent.click(screen.getByRole('button', { name: 'Nochmals' }));
    expect(tryAgain).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('says what went well as a status, with its detail below', async () => {
    render(<Toaster locale="de" />);

    act(() => {
      toast.success('Ausleihe gespeichert', { description: '3 Zelte an Cevi Uster' });
    });

    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('Ausleihe gespeichert');
    expect(status.textContent).toContain('3 Zelte an Cevi Uster');
  });

  it('replaces a toast of the same id instead of stacking a second one', async () => {
    render(<Toaster locale="de" />);

    act(() => {
      toast.error('Du bist offline.', { id: 'offline' });
      toast.error('Du bist offline.', { id: 'offline' });
    });

    await screen.findByRole('alert');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
