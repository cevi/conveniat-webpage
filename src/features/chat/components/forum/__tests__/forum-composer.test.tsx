/**
 * @jest-environment jsdom
 */
import { ForumComposer } from '@/features/chat/components/forum/forum-composer';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

let topics: unknown[];
let privateReportsAvailable = true;
const createPost = jest.fn<Promise<{ id: string; pending: boolean }>, [unknown]>(() =>
  Promise.resolve({ id: 'post', pending: false }),
);
const joinReportTopic = jest.fn(() => Promise.resolve({ topicId: 'zentrale' }));
const getUploadUrl = jest.fn((input: unknown) =>
  Promise.resolve({
    url: 'https://s3.example/put',
    key: `chat-images/${(input as { chatId: string }).chatId}/photo.jpg`,
  }),
);
// what `prepareChatImage` makes of the picked photo; the browser's canvas is not in jsdom
const preparedImage = new File([new Uint8Array(1234)], 'photo.jpg', { type: 'image/jpeg' });
jest.mock('@/features/chat/utils/prepare-chat-image', () => ({
  prepareChatImage: (): Promise<File> => Promise.resolve(preparedImage),
}));

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: (): boolean => true }));
// the composer brings its own bar in place of the app header
jest.mock('@/components/header/hide-header-context', () => ({ SetHideHeader: (): null => null }));
let address = '';
const back = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: (): object => ({ replace: jest.fn(), back }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(address),
}));
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

/** renders the composer for someone in `topics`, with the forum already loaded */
const renderComposer = (): void => {
  const settings = { moderationRequired: false, privateReportsAvailable };
  const { trpc, queryClient, wrapper } = createTestTrpc({
    'forum.getForumTopicList': () => topics,
    'forum.getForumSettings': () => settings,
    'forum.getForumPostSuggestionList': () => [],
    'forum.createForumPost': createPost,
    'forum.getForumPrivateReportTopic': joinReportTopic,
    'chat.getUploadUrl': getUploadUrl,
  });
  queryClient.setQueryData(trpc.forum.getForumTopicList.queryKey({}), topics as never);
  queryClient.setQueryData(trpc.forum.getForumSettings.queryKey({}), settings as never);
  render(<ForumComposer />, { wrapper });
};

const segment = (name: string): HTMLElement => screen.getByRole('button', { name });
const writeTitle = (): void => {
  fireEvent.change(screen.getByPlaceholderText(/Toitoi in der Mitte/), {
    target: { value: 'Toitoi in der Mitte ist voll' },
  });
};

// jsdom keeps no navigation entries; the composer reads them to tell whether it is the first page
beforeAll(() => {
  Object.defineProperty(performance, 'getEntriesByType', {
    value: (): PerformanceEntryList => [],
    configurable: true,
  });
});

beforeEach(() => {
  address = '';
  privateReportsAvailable = true;
  createPost.mockClear();
  joinReportTopic.mockClear();
  getUploadUrl.mockClear();
  back.mockClear();
});

describe('the composer', () => {
  it('is the private report, without a toggle, for someone in no topic', () => {
    topics = [];
    renderComposer();
    writeTitle();

    expect(screen.queryByRole('button', { name: 'Öffentlich' })).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'An die Zentrale senden' }).disabled,
    ).toBe(false);
    expect(screen.getByText(/Nur du und das OK sehen deine Nachricht/)).toBeTruthy();
  });

  it('switches between Öffentlich and Privat for someone in a topic', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    renderComposer();
    writeTitle();
    fireEvent.click(segment('Privat'));

    expect(segment('Privat').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'An die Zentrale senden' })).toBeTruthy();
  });

  it('sends a private report as a private post to the topic for private reports', async () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    renderComposer();
    writeTitle();
    fireEvent.click(segment('Privat'));
    fireEvent.click(screen.getByRole('button', { name: 'An die Zentrale senden' }));

    await waitFor(() => expect(createPost).toHaveBeenCalled());
    expect(createPost.mock.calls[0]?.[0]).toMatchObject({
      topicId: 'zentrale',
      private: true,
      title: 'Toitoi in der Mitte ist voll',
    });
  });

  it('uploads a picked photo as the prepared JPEG, under the length it was signed for', async () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    const put = jest.fn<Promise<{ ok: boolean; status: number }>, [string, RequestInit]>(() =>
      Promise.resolve({ ok: true, status: 200 }),
    );
    globalThis.fetch = put as unknown as typeof fetch;
    URL.createObjectURL = (): string => 'blob:preview';
    renderComposer();
    writeTitle();
    // a full-size library photo, as the iPad hands it over
    const picked = new File([new Uint8Array(50_000)], 'IMG_0001.HEIC', { type: 'image/heic' });
    fireEvent.change(screen.getByLabelText(/Foto/), { target: { files: [picked] } });
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }));

    // the HEIC cannot be previewed here, as outside Safari, so its tile shows an icon instead
    fireEvent.error(document.querySelector('img[src="blob:preview"]') as Element);
    expect(document.querySelector('img[src="blob:preview"]')).toBeNull();

    await waitFor(() => expect(createPost).toHaveBeenCalled());
    expect(getUploadUrl.mock.calls[0]?.[0]).toMatchObject({
      chatId: 'topic',
      contentType: 'image/jpeg',
      contentLength: 1234,
    });
    expect(put.mock.calls[0]?.[1].body).toBe(preparedImage);
    expect(put.mock.calls[0]?.[1].headers).toEqual({ 'Content-Type': 'image/jpeg' });
    expect(createPost.mock.calls[0]?.[0]).toMatchObject({
      images: ['chat-images/topic/photo.jpg'],
    });
  });

  it('offers no Privat while editors chose no topic for private reports', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    privateReportsAvailable = false;
    address = 'private=1';
    renderComposer();
    writeTitle();

    expect(screen.queryByRole('button', { name: 'Privat' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).toBeTruthy();
  });

  it('starts on Öffentlich for someone in a topic', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    renderComposer();
    writeTitle();

    expect(segment('Öffentlich').getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Veröffentlichen' }).disabled,
    ).toBe(false);
  });

  it('is titled Neuer Beitrag and goes back to where it was opened', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    renderComposer();

    expect(screen.getByRole('heading', { name: 'Neuer Beitrag' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(back).toHaveBeenCalled();
  });

  it('takes the title the search found nothing for', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    address = 'title=Zeltheringe';
    renderComposer();

    expect(screen.getByPlaceholderText<HTMLInputElement>(/Toitoi in der Mitte/).value).toBe(
      'Zeltheringe',
    );
  });

  it('brings a removed spot back with Rückgängig', () => {
    topics = [{ id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false }];
    address = 'lng=8.301851&lat=46.504806&annotation=q1&label=Quartier+1';
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Standort entfernen' }));
    expect(screen.queryByText('Quartier 1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));

    expect(screen.getByText('Quartier 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Rückgängig' })).toBeNull();
  });
});
