/**
 * @jest-environment jsdom
 */

import { TagView } from '@/features/wristbands/components/tag-view';
import type { WristbandCard } from '@/features/wristbands/types';
import { act, fireEvent, render, screen } from '@testing-library/react';

const BAND = '04A1B2C3D4E5F6';
const OTHER_BAND = '04112233445566';
const SIGNATURE = 'AB'.repeat(32);

const mockIdentifyBand = jest.fn();
const mockStartChat = jest.fn();
const mockCardInputs: unknown[] = [];

/** The server's answer: Lea's band is verified only with her signature. */
const cardFor = (input: { uid: string; signature?: string | null }): WristbandCard => ({
  verified: input.signature === SIGNATURE,
  wearer: { state: 'worn', name: 'Fuchs', canChat: true },
  safety: null,
});

jest.mock('@/trpc/client', () => ({
  trpc: {
    wristband: {
      getWristbandCard: {
        useQuery: (
          input: { uid: string; signature?: string | null },
          options: { enabled: boolean },
        ): unknown => {
          if (options.enabled) mockCardInputs.push(input);
          return {
            data: options.enabled ? cardFor(input) : undefined,
            isError: false,
            isPlaceholderData: false,
            refetch: jest.fn(),
          };
        },
      },
    },
    chat: {
      startChatFromWristband: {
        useMutation: (): unknown => ({ mutate: mockStartChat, isPending: false }),
      },
    },
  },
}));
jest.mock('@/features/wristbands/native-nfc', () => ({
  ...jest.requireActual<object>('@/features/wristbands/native-nfc'),
  identifyBand: (...arguments_: unknown[]): unknown => mockIdentifyBand(...arguments_),
}));
jest.mock('@/features/wristbands/hooks/use-native-nfc-available', () => ({
  useNativeNfcAvailable: (): boolean => true,
}));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('next/navigation', () => ({ useRouter: (): unknown => ({ push: jest.fn() }) }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }): React.JSX.Element => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  mockIdentifyBand.mockReset();
  mockStartChat.mockReset();
  mockCardInputs.length = 0;
  globalThis.history.replaceState({ router: 'state' }, '', `/tag/${BAND}`);
});

const checkBand = async (): Promise<void> => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Band prüfen' }));
    await Promise.resolve();
  });
};

describe('checking the band on its page', () => {
  it('asks to scan again for a band known by its UID alone, and offers no chat', () => {
    render(<TagView uid={BAND} />);
    expect(
      screen.getByText('Erneut scannen, um Details zu sehen oder einen Chat zu starten'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chat starten/ })).not.toBeInTheDocument();
    expect(mockCardInputs).toContainEqual({ uid: BAND });
  });

  it('verifies the card when the same band is held to the phone, and chats with its signature', async () => {
    mockIdentifyBand.mockResolvedValue({ uid: BAND.toLowerCase(), signature: SIGNATURE });
    render(<TagView uid={BAND} />);
    await checkBand();

    expect(mockCardInputs).toContainEqual({ uid: BAND, signature: SIGNATURE });
    expect(screen.queryByRole('button', { name: 'Band prüfen' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chat starten' }));
    expect(mockStartChat).toHaveBeenCalledWith({ uid: BAND, signature: SIGNATURE });
  });

  it('offers to show another band held to the phone instead of checking it', async () => {
    mockIdentifyBand.mockResolvedValue({ uid: OTHER_BAND, signature: SIGNATURE });
    render(<TagView uid={BAND} />);
    await checkBand();

    expect(screen.getByText('Das ist ein anderes Band')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dieses Band zeigen' })).toHaveAttribute(
      'href',
      `/tag/${OTHER_BAND}`,
    );
    expect(mockCardInputs).not.toContainEqual(expect.objectContaining({ signature: SIGNATURE }));
    expect(screen.queryByRole('button', { name: 'Chat starten' })).not.toBeInTheDocument();
  });

  it('verifies the card at once with the signature the tap brought, and drops it from the address', () => {
    globalThis.history.replaceState({ router: 'state' }, '', `/tag/${BAND}?x=1#sig=${SIGNATURE}`);
    render(<TagView uid={BAND} />);

    expect(mockIdentifyBand).not.toHaveBeenCalled();
    // the card waits for the address, so it is never asked without the signature
    expect(mockCardInputs).toContainEqual({ uid: BAND, signature: SIGNATURE });
    expect(mockCardInputs).not.toContainEqual({ uid: BAND });
    expect(screen.getByRole('button', { name: 'Chat starten' })).toBeInTheDocument();
    expect(globalThis.location.hash).toBe('');
    expect(globalThis.location.search).toBe('?x=1');
    expect(globalThis.history.state).toEqual({ router: 'state' });
  });
});
