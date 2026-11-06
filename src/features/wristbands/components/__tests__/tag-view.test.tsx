/**
 * @jest-environment jsdom
 */

import { TagView } from '@/features/wristbands/components/tag-view';
import type { WristbandCard } from '@/features/wristbands/types';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import {
  act,
  fireEvent,
  render as renderWithoutTrpc,
  screen,
  waitFor,
} from '@testing-library/react';
import type React from 'react';

const BAND = '04A1B2C3D4E5F6';
const OTHER_BAND = '04112233445566';
const SIGNATURE = 'AB'.repeat(32);

const mockIdentifyBand = jest.fn();
const mockStartChat = jest.fn(() => ({ status: 'started', chatId: 'chat-fuchs' }));
let testTrpc: TestTrpc;

/** The server's answer: Lea's band is verified only with her signature. */
const cardFor = (input: { uid: string; signature?: string | null }): WristbandCard => ({
  verified: input.signature === SIGNATURE,
  wearer: { state: 'worn', name: 'Fuchs', canChat: true },
  safety: null,
});

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
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

/** what the page asked the server for the card, in order */
const cardInputs = (): unknown[] =>
  testTrpc.calls.filter((call) => call.path === 'wristband.getWristbandCard').map((c) => c.input);

const render = (ui: React.ReactElement): ReturnType<typeof renderWithoutTrpc> => {
  testTrpc = createTestTrpc({
    'wristband.getWristbandCard': (input) =>
      cardFor(input as { uid: string; signature?: string | null }),
    'chat.startChatFromWristband': mockStartChat,
  });
  return renderWithoutTrpc(ui, { wrapper: testTrpc.wrapper });
};

beforeEach(() => {
  mockIdentifyBand.mockReset();
  mockStartChat.mockClear();
  globalThis.history.replaceState({ router: 'state' }, '', `/tag/${BAND}`);
});

const checkBand = async (): Promise<void> => {
  // offered once the card read by the UID alone has arrived
  const check = await screen.findByRole('button', { name: 'Band prüfen' });
  await act(async () => {
    fireEvent.click(check);
    await Promise.resolve();
  });
};

describe('checking the band on its page', () => {
  it('asks to scan again for a band known by its UID alone, and offers no chat', async () => {
    render(<TagView uid={BAND} />);
    expect(
      await screen.findByText('Erneut scannen, um Details zu sehen oder einen Chat zu starten'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chat starten/ })).not.toBeInTheDocument();
    expect(cardInputs()).toContainEqual({ uid: BAND });
  });

  it('verifies the card when the same band is held to the phone, and chats with its signature', async () => {
    mockIdentifyBand.mockResolvedValue({ uid: BAND.toLowerCase(), signature: SIGNATURE });
    render(<TagView uid={BAND} />);
    await checkBand();

    fireEvent.click(await screen.findByRole('button', { name: 'Chat starten' }));
    expect(cardInputs()).toContainEqual({ uid: BAND, signature: SIGNATURE });
    expect(screen.queryByRole('button', { name: 'Band prüfen' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockStartChat).toHaveBeenCalledWith({ uid: BAND, signature: SIGNATURE }),
    );
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
    expect(cardInputs()).not.toContainEqual(expect.objectContaining({ signature: SIGNATURE }));
    expect(screen.queryByRole('button', { name: 'Chat starten' })).not.toBeInTheDocument();
  });

  it('verifies the card at once with the signature the tap brought, and drops it from the address', async () => {
    globalThis.history.replaceState({ router: 'state' }, '', `/tag/${BAND}?x=1#sig=${SIGNATURE}`);
    render(<TagView uid={BAND} />);

    expect(mockIdentifyBand).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Chat starten' })).toBeInTheDocument();
    // the card waits for the address, so it is never asked without the signature
    expect(cardInputs()).toContainEqual({ uid: BAND, signature: SIGNATURE });
    expect(cardInputs()).not.toContainEqual({ uid: BAND });
    expect(globalThis.location.hash).toBe('');
    expect(globalThis.location.search).toBe('?x=1');
    expect(globalThis.history.state).toEqual({ router: 'state' });
  });
});
