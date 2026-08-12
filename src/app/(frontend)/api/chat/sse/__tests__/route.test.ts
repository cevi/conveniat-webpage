/* eslint-disable @typescript-eslint/unbound-method */
import { GET } from '@/app/(frontend)/api/chat/sse/route';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import prisma from '@/lib/db/prisma';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { NextRequest } from 'next/server';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {},
}));

jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  Roles: {
    FullAdmin: 'FullAdmin',
    WebCoreTeam: 'WebCoreTeam',
  },
  hasAccessToThisUser: jest.fn().mockReturnValue(false),
}));

jest.mock('superjson', () => ({
  parse: (data: unknown): unknown => JSON.parse(data as string),
  stringify: (data: unknown): string => JSON.stringify(data),
}));

jest.mock('@/utils/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/utils/auth-helpers', () => ({
  isValidNextAuthUser: jest.fn(),
}));

jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: {
    subscribe: jest.fn().mockResolvedValue(jest.fn()),
    onConnectionRestored: jest.fn().mockReturnValue(jest.fn()),
  },
}));

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    chatMembership: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockAuth = auth as unknown as jest.Mock;
const mockIsValidNextAuthUser = isValidNextAuthUser as unknown as jest.Mock;

describe('GET /api/chat/sse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 Unauthorized if user is not authenticated', async () => {
    mockAuth.mockResolvedValue(void 0);
    mockIsValidNextAuthUser.mockReturnValue(false);

    const request = new NextRequest('https://konekta.ch/api/chat/sse');
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized');
  });

  it('returns 200 OK stream for personal user channel when chatIds is missing or empty', async () => {
    const mockUser = { uuid: 'user-uuid-123', group_ids: [] };
    mockAuth.mockResolvedValue({ user: mockUser });
    mockIsValidNextAuthUser.mockReturnValue(true);

    const request = new NextRequest('https://konekta.ch/api/chat/sse?chatIds=');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(chatPubSub.subscribe).toHaveBeenCalledWith('user-uuid-123', expect.any(Function));
  });

  it('returns 400 Bad Request if an invalid UUID format is supplied', async () => {
    const mockUser = { uuid: 'user-uuid-123', group_ids: [] };
    mockAuth.mockResolvedValue({ user: mockUser });
    mockIsValidNextAuthUser.mockReturnValue(true);

    const request = new NextRequest('https://konekta.ch/api/chat/sse?chatIds=invalid!uuid');
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Invalid chat ID format');
  });

  it('returns 403 Forbidden if non-admin requests subscription to the "all" channel', async () => {
    const mockUser = { uuid: 'user-uuid-123', group_ids: ['member-group'] };
    mockAuth.mockResolvedValue({ user: mockUser });
    mockIsValidNextAuthUser.mockReturnValue(true);

    const request = new NextRequest('https://konekta.ch/api/chat/sse?chatIds=all');
    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(await response.text()).toContain('Forbidden');
  });

  it('subscribes user to requested valid chat IDs if member', async () => {
    const validChatId = '550e8400-e29b-41d4-a716-446655440000';
    const mockUser = { uuid: 'user-uuid-123', group_ids: ['member-group'] };
    mockAuth.mockResolvedValue({ user: mockUser });
    mockIsValidNextAuthUser.mockReturnValue(true);
    (prisma.chatMembership.findMany as unknown as jest.Mock).mockResolvedValue([
      { chatId: validChatId, userId: 'user-uuid-123' },
    ]);

    const request = new NextRequest(`https://konekta.ch/api/chat/sse?chatIds=${validChatId}`);
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(chatPubSub.subscribe).toHaveBeenCalledWith('user-uuid-123', expect.any(Function));
    expect(chatPubSub.subscribe).toHaveBeenCalledWith(validChatId, expect.any(Function));
  });

  it('accepts 24-character Mongo ObjectId format for chat/user IDs', async () => {
    const objectId = '6a6702e5dbb6944dd8400954';
    const mockUser = { uuid: 'user-uuid-123', group_ids: ['member-group'] };
    mockAuth.mockResolvedValue({ user: mockUser });
    mockIsValidNextAuthUser.mockReturnValue(true);
    (prisma.chatMembership.findMany as unknown as jest.Mock).mockResolvedValue([
      { chatId: objectId, userId: 'user-uuid-123' },
    ]);

    const request = new NextRequest(`https://konekta.ch/api/chat/sse?chatIds=${objectId}`);
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(chatPubSub.subscribe).toHaveBeenCalledWith(objectId, expect.any(Function));
  });

  it('opens the stream with a heartbeat event, so clients can detect a dead connection', async () => {
    const mockUser = { uuid: 'user-uuid-123', group_ids: [] };
    mockAuth.mockResolvedValue({ user: mockUser });
    mockIsValidNextAuthUser.mockReturnValue(true);

    const request = new NextRequest('https://konekta.ch/api/chat/sse');
    const response = await GET(request);

    const reader = response.body?.getReader();
    const firstChunk = await reader?.read();
    const opening = new TextDecoder().decode(firstChunk?.value);
    const secondChunk = await reader?.read();
    const heartbeat = new TextDecoder().decode(secondChunk?.value);

    expect(opening).toContain(':ok');
    expect(heartbeat).toContain('event: heartbeat');
    await reader?.cancel();
  });

  it('tells the client to refetch when the pub/sub connection was re-established', async () => {
    const mockUser = { uuid: 'user-uuid-123', group_ids: [] };
    mockAuth.mockResolvedValue({ user: mockUser });
    mockIsValidNextAuthUser.mockReturnValue(true);

    const request = new NextRequest('https://konekta.ch/api/chat/sse');
    const response = await GET(request);

    const restoredCalls = (chatPubSub.onConnectionRestored as unknown as jest.Mock).mock
      .calls as (() => void)[][];
    const onRestored = restoredCalls[0]?.[0];
    if (onRestored === undefined) {
      throw new Error('the route did not subscribe to pub/sub connection changes');
    }

    const reader = response.body?.getReader();
    // Drain the opening frames (`:ok` and the first heartbeat) before the gap
    // notification is written.
    await reader?.read();
    await reader?.read();
    onRestored();
    const chunk = await reader?.read();

    expect(new TextDecoder().decode(chunk?.value)).toContain('event: resync');
    await reader?.cancel();
  });
});
