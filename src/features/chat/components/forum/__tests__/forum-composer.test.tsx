/**
 * @jest-environment jsdom
 */
import { ForumComposer } from '@/features/chat/components/forum/forum-composer';
import { createTestTrpc } from '@/trpc/test-trpc';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

let topics: unknown[];
const createPost = jest.fn<Promise<{ id: string; pending: boolean }>, [unknown]>(() =>
  Promise.resolve({ id: 'post', pending: false }),
);
const openConversation = jest.fn<Promise<{ chatId: string }>, [unknown]>(() =>
  Promise.resolve({ chatId: 'conversation-chat' }),
);
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
const renderComposer = (): { calls: { path: string; input: unknown }[] } => {
  const settings = { moderationRequired: false };
  const { trpc, queryClient, wrapper, calls } = createTestTrpc({
    'forum.getForumTopicList': () => topics,
    'forum.getForumSettings': () => settings,
    'forum.getForumPostSuggestionList': () => [],
    'forum.createForumPost': createPost,
    'forum.openForumConversation': openConversation,
    'chat.getUploadUrl': getUploadUrl,
  });
  queryClient.setQueryData(trpc.forum.getForumTopicList.queryKey({}), topics as never);
  queryClient.setQueryData(trpc.forum.getForumSettings.queryKey({}), settings as never);
  render(<ForumComposer />, { wrapper });
  return { calls };
};

const topic = { id: 'topic', name: 'Platz & Infrastruktur', isAdmin: false };
// a topic whose Kernteam takes private conversations
const privateTopic = {
  id: 'essen',
  name: 'Essen',
  isAdmin: false,
  allowsPrivateConversations: true,
};

type BucketPut = jest.Mock<Promise<{ ok: boolean; status: number }>, [string, RequestInit]>;

/** picks a full-size library photo, as the iPad hands it over; returns the bucket's PUT */
const pickPhoto = (): BucketPut => {
  const put: BucketPut = jest.fn<Promise<{ ok: boolean; status: number }>, [string, RequestInit]>(
    () => Promise.resolve({ ok: true, status: 200 }),
  );
  globalThis.fetch = put as unknown as typeof fetch;
  URL.createObjectURL = (): string => 'blob:preview';
  const picked = new File([new Uint8Array(50_000)], 'IMG_0001.HEIC', { type: 'image/heic' });
  fireEvent.change(screen.getByLabelText(/Foto/), { target: { files: [picked] } });
  return put;
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
  createPost.mockClear();
  openConversation.mockClear();
  getUploadUrl.mockClear();
  back.mockClear();
});

describe('the composer', () => {
  it('offers no Privat while no topic of the user takes private conversations', () => {
    topics = [topic];
    renderComposer();
    writeTitle();

    expect(screen.queryByRole('button', { name: 'Privat' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Öffentlich' })).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Veröffentlichen' }).disabled,
    ).toBe(false);
  });

  it('leads a link to Privat back to Öffentlich where no topic takes private conversations', () => {
    topics = [topic];
    address = 'private=1';
    renderComposer();
    writeTitle();

    expect(screen.getByText('Kein Thema nimmt gerade private Gespräche an.')).toBeTruthy();
    fireEvent.click(segment('Öffentlich'));

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Veröffentlichen' }).disabled,
    ).toBe(false);
  });

  it('starts on Öffentlich and switches to Privat where a topic takes private conversations', () => {
    topics = [topic, privateTopic];
    renderComposer();
    writeTitle();

    expect(segment('Öffentlich').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(segment('Privat'));

    expect(segment('Privat').getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Privat ans Kernteam senden' })
        .disabled,
    ).toBe(false);
    expect(screen.getByText(/nur mit dem Kernteam von «Essen»/)).toBeTruthy();
  });

  it('opens on Privat from "Kernteam privat schreiben"', () => {
    topics = [topic, privateTopic];
    address = 'conversation=1&topic=essen';
    renderComposer();

    expect(segment('Privat').getAttribute('aria-pressed')).toBe('true');
  });

  it('starts on a question, and sends the kind chosen', async () => {
    topics = [topic];
    renderComposer();
    writeTitle();

    expect(segment('Frage').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(segment('Idee'));
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }));

    await waitFor(() => expect(createPost).toHaveBeenCalled());
    expect(createPost.mock.calls[0]?.[0]).toMatchObject({
      topicId: 'topic',
      kind: 'IDEA',
      title: 'Toitoi in der Mitte ist voll',
    });
    expect(openConversation).not.toHaveBeenCalled();
  });

  it('takes the kind the map asks for', async () => {
    topics = [topic];
    address = 'kind=PROBLEM';
    renderComposer();
    writeTitle();

    expect(segment('Problem').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }));

    await waitFor(() => expect(createPost).toHaveBeenCalled());
    expect(createPost.mock.calls[0]?.[0]).toMatchObject({ kind: 'PROBLEM' });
  });

  it('opens a conversation with the Kernteam first, and writes the post and its photo into it', async () => {
    topics = [topic, privateTopic];
    const { calls } = renderComposer();
    writeTitle();
    fireEvent.click(segment('Privat'));
    pickPhoto();
    fireEvent.click(screen.getByRole('button', { name: 'Privat ans Kernteam senden' }));

    await waitFor(() => expect(createPost).toHaveBeenCalled());
    // only the topic that takes private conversations is offered, so it is the one written to
    expect(openConversation.mock.calls[0]?.[0]).toMatchObject({ topicId: 'essen' });
    expect(
      typeof (openConversation.mock.calls[0]?.[0] as { conversationId?: unknown }).conversationId,
    ).toBe('string');
    const paths = calls.map((call) => call.path);
    expect(paths.indexOf('forum.openForumConversation')).toBeLessThan(
      paths.indexOf('chat.getUploadUrl'),
    );
    expect(paths.indexOf('chat.getUploadUrl')).toBeLessThan(paths.indexOf('forum.createForumPost'));
    expect(getUploadUrl.mock.calls[0]?.[0]).toMatchObject({ chatId: 'conversation-chat' });
    expect(createPost.mock.calls[0]?.[0]).toMatchObject({
      topicId: 'conversation-chat',
      title: 'Toitoi in der Mitte ist voll',
      images: ['chat-images/conversation-chat/photo.jpg'],
    });
  });

  it('uploads a picked photo as the prepared JPEG, under the length it was signed for', async () => {
    topics = [topic];
    renderComposer();
    writeTitle();
    const put = pickPhoto();
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

  it('is titled Neuer Beitrag and goes back to where it was opened', () => {
    topics = [topic];
    renderComposer();

    expect(screen.getByRole('heading', { name: 'Neuer Beitrag' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(back).toHaveBeenCalled();
  });

  it('takes the title the search found nothing for', () => {
    topics = [topic];
    address = 'title=Zeltheringe';
    renderComposer();

    expect(screen.getByPlaceholderText<HTMLInputElement>(/Toitoi in der Mitte/).value).toBe(
      'Zeltheringe',
    );
  });

  it('brings a removed spot back with Rückgängig', () => {
    topics = [topic];
    address = 'lng=8.301851&lat=46.504806&annotation=q1&label=Quartier+1';
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Standort entfernen' }));
    expect(screen.queryByText('Quartier 1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));

    expect(screen.getByText('Quartier 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Rückgängig' })).toBeNull();
  });
});
