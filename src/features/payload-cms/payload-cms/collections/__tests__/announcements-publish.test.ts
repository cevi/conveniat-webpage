jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    GROUPS_WITH_API_ACCESS: [541],
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
  },
}));
jest.mock('@/utils/auth-helpers', () => ({ getAuthenticateUsingCeviDB: jest.fn() }));
// the editor config only matters to the admin panel, and lexical ships as ESM only
jest.mock('@payloadcms/richtext-lexical', () => ({
  AlignFeature: jest.fn(),
  lexicalEditor: jest.fn(),
  UnorderedListFeature: jest.fn(),
}));
jest.mock('@/features/payload-cms/payload-cms/plugins/lexical-editor', () => ({
  minimalEditorFeatures: [],
}));
jest.mock('@/features/payload-cms/payload-cms/endpoints/translate-announcement', () => ({
  translateAnnouncementHandler: jest.fn(),
}));
const mockSendNotification = jest.fn();
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (...args: unknown[]): unknown => mockSendNotification(...args),
}));
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: jest.fn().mockReturnValue(Promise.resolve()) },
}));
jest.mock('@/features/payload-cms/payload-cms/utils/announcement-message-payload', () => ({
  buildAnnouncementMessagePayload: jest.fn().mockResolvedValue({
    de: { text: '*Tagesstart*\n\nUm 8 Uhr', title: 'Tagesstart', body: 'Um 8 Uhr' },
  }),
}));
const mockMessageCreate = jest.fn();
const mockMessageFindUnique = jest.fn();
const mockContentCreate = jest.fn();
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    // wrapped: the factory runs before the mocks above are initialised
    message: {
      create: (...args: unknown[]): unknown => mockMessageCreate(...args),
      findUnique: (...args: unknown[]): unknown => mockMessageFindUnique(...args),
      delete: jest.fn(),
    },
    messageContent: {
      create: (...args: unknown[]): unknown => mockContentCreate(...args),
      // eslint-disable-next-line unicorn/no-null
      findFirst: jest.fn().mockResolvedValue(null),
    },
    chatMembership: {
      findMany: jest.fn().mockResolvedValue([{ userId: 'author' }, { userId: 'participant' }]),
    },
    chat: { update: jest.fn() },
  },
}));

import { AnnouncementsCollection } from '@/features/payload-cms/payload-cms/collections/announcements';
import type { Announcement } from '@/features/payload-cms/payload-types';
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload';

const request = {
  context: {},
  user: { id: 'author' },
  payload: {
    findByID: jest.fn().mockResolvedValue({ id: 'channel', chatUuid: 'chat' }),
    logger: { error: jest.fn() },
  },
} as unknown as PayloadRequest;

const [beforeChange] = (AnnouncementsCollection.hooks?.beforeChange ??
  []) as CollectionBeforeChangeHook[];
const [afterChange] = (AnnouncementsCollection.hooks?.afterChange ??
  []) as CollectionAfterChangeHook[];

/** Runs the collection's `beforeChange` hook for a publish from the admin panel. */
const beforePublish = async (data: Partial<Announcement>): Promise<Partial<Announcement>> =>
  (await beforeChange?.({
    data: { _status: 'published', channel: 'channel', ...data },
    originalDoc: { id: 'announcement' },
    req: request,
    operation: 'update',
  } as unknown as Parameters<CollectionBeforeChangeHook>[0])) as Partial<Announcement>;

/** Runs the collection's `afterChange` hook for the document Payload saved. */
const afterSave = async (saved: Partial<Announcement>): Promise<void> => {
  await afterChange?.({
    doc: { id: 'announcement', channel: 'channel', author: 'author', ...saved },
    previousDoc: { id: 'announcement' },
    req: request,
    operation: 'update',
  } as unknown as Parameters<CollectionAfterChangeHook>[0]);
};

describe('publishing an announcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendNotification.mockReturnValue(Promise.resolve());
    mockMessageCreate.mockImplementation(({ data }: { data: { uuid: string } }) => ({
      uuid: data.uuid,
      createdAt: new Date(),
    }));
  });

  it('sends nothing before Payload has validated the announcement', async () => {
    const data = await beforePublish({ status: 'published' });

    expect(data.chatMessageUuid).toEqual(expect.any(String));
    expect(mockMessageCreate).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('posts the reserved message and pushes it once the announcement is saved', async () => {
    const data = await beforePublish({ status: 'published' });
    // eslint-disable-next-line unicorn/no-null
    mockMessageFindUnique.mockResolvedValue(null);

    await afterSave(data);

    expect(mockMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uuid: data.chatMessageUuid }) as unknown,
      }),
    );
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it('keeps the message of an announcement published before', async () => {
    const data = await beforePublish({ status: 'published', chatMessageUuid: 'message' });

    expect(data.chatMessageUuid).toBe('message');
  });

  it('revises the chat message on a republish without a second push', async () => {
    mockMessageFindUnique.mockResolvedValue({
      uuid: 'message',
      chatId: 'chat',
      senderId: 'author',
    });

    await afterSave({ _status: 'published', status: 'published', chatMessageUuid: 'message' });

    expect(mockContentCreate).toHaveBeenCalled();
    expect(mockMessageCreate).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('leaves a scheduled announcement to the job', async () => {
    const data = await beforePublish({ status: 'scheduled' });
    await afterSave({ ...data, _status: 'published' });

    expect(data.chatMessageUuid).toBeUndefined();
    expect(mockMessageCreate).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
