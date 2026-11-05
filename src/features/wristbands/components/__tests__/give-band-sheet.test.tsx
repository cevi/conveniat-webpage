/**
 * @jest-environment jsdom
 */

import { GiveBandSheet } from '@/features/wristbands/components/give-band-sheet';
import type { BandScannerHandlers } from '@/features/wristbands/hooks/use-band-scanner';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';
import { navigateWithinApp } from '@/hooks/use-app-webview-navigate';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockHandlers: BandScannerHandlers | undefined;
let mockScanning = false;
const mockAssign = jest.fn((): Promise<void> => Promise.resolve());
const mockReplace = jest.fn((): Promise<void> => Promise.resolve());
const mockUnassign = jest.fn((): Promise<void> => Promise.resolve());

// the phone: whoever holds a band to it reaches the handlers the sheet gave the scanner
jest.mock('@/features/wristbands/hooks/use-band-scanner', () => ({
  useBandScanner: ({
    active,
    handlers,
  }: {
    active: boolean;
    handlers: BandScannerHandlers;
  }): unknown => {
    mockHandlers = handlers;
    mockScanning = active;
    return { phase: active ? 'waiting' : 'off', notice: undefined, resume: jest.fn() };
  },
}));
jest.mock('@/features/wristbands/hooks/use-native-nfc-available', () => ({
  useNativeNfcAvailable: (): boolean => true,
}));
jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): unknown => ({
      client: {
        wristband: {
          assignWristband: { mutate: mockAssign },
          replaceWristband: { mutate: mockReplace },
          unassignWristband: { mutate: mockUnassign },
        },
      },
      wristband: {
        getHofWristbandList: {
          getData: (): undefined => undefined,
          setData: jest.fn(),
          invalidate: jest.fn(() => Promise.resolve()),
        },
      },
    }),
  },
}));
jest.mock('@/components/ui/bottom-sheet', () => ({
  BottomSheet: ({
    open,
    children,
    footer,
  }: {
    open: boolean;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }): React.ReactNode =>
    open ? (
      <div role="dialog">
        {children}
        {footer}
      </div>
    ) : null,
}));

const lea: HofPerson = {
  registrationId: 'reg-lea',
  fullName: 'Lea Meier',
  nickname: 'Funke',
  abteilung: 'Cevi Uster',
  role: 'participant',
  band: null,
  helper: false,
};
const leaWithBand: HofPerson = { ...lea, band: { uid: '04AAAAAAAAAAAA', status: 'active' } };
const NEW_BAND = '04BBBBBBBBBBBB';

const show = (person: HofPerson, onClose = jest.fn()): jest.Mock => {
  const list: HofWristbandList = { people: [person], spareBands: [] };
  render(<GiveBandSheet hofId="uster" list={list} person={person} locale="de" onClose={onClose} />);
  return onClose;
};

const holdBand = async (uid = NEW_BAND): Promise<void> => {
  await act(async () => {
    expect(mockHandlers?.onBandDetected(uid)).toBeNull();
    await mockHandlers?.onRecorded(uid);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHandlers = undefined;
});

describe('the band sheet at the station', () => {
  it('waits for a band for a person without one, and gives it to them', async () => {
    show(lea);
    expect(screen.getByText('Band ans Handy halten')).toBeInTheDocument();
    expect(mockScanning).toBe(true);

    await holdBand();
    expect(mockAssign).toHaveBeenCalledWith({
      hofId: 'uster',
      uid: NEW_BAND,
      registrationId: 'reg-lea',
    });
    expect(screen.getByText('Band gehört jetzt Funke')).toBeInTheDocument();
    // the scanner stops, so a second band on the phone goes to nobody by mistake
    expect(mockScanning).toBe(false);
  });

  it('takes a band just given back with Rückgängig, and closes for the next person', async () => {
    const onClose = show(lea);
    await holdBand();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
      await Promise.resolve();
    });
    expect(mockUnassign).toHaveBeenCalledWith({ hofId: 'uster', uid: NEW_BAND });
    expect(onClose).toHaveBeenCalled();
  });

  it('offers a person with a band a new one, which blocks the old and cannot be undone', async () => {
    show(leaWithBand);
    expect(mockScanning).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Neues Band geben/ }));
    expect(screen.getByText(/Das alte Band wird gesperrt/)).toBeInTheDocument();

    await holdBand();
    expect(mockReplace).toHaveBeenCalledWith({
      hofId: 'uster',
      uid: NEW_BAND,
      registrationId: 'reg-lea',
    });
    expect(mockAssign).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Rückgängig' })).not.toBeInTheDocument();
  });

  it('refuses the old band held instead of the new one', () => {
    show(leaWithBand);
    fireEvent.click(screen.getByRole('button', { name: /Neues Band geben/ }));
    expect(mockHandlers?.onBandDetected('04AAAAAAAAAAAA')).toMatchObject({
      kind: 'refused',
      title: 'Das ist das alte Band von Lea Meier v/o Funke',
    });
  });

  it('keeps a band tapped meanwhile from opening a second sheet over it', async () => {
    const onClose = show(lea);
    const push = jest.fn();
    const tap = (uid: string): boolean =>
      navigateWithinApp(`${globalThis.location.origin}/tag/${uid}`, push);

    // waiting for a band: the band is the sheet's
    tap('04CCCCCCCCCCCC');
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await holdBand();
    // the band just given, laid on the phone again while the sheet says whose it is
    tap(NEW_BAND);
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    // another band closes the sheet and opens as its own
    tap('04CCCCCCCCCCCC');
    expect(onClose).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/tag/04CCCCCCCCCCCC');
  });
});
