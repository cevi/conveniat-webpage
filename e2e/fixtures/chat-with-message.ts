import type { APIRequestContext } from '@playwright/test';
import { expect, request } from '@playwright/test';
import superjson, { type SuperJSONResult } from 'superjson';

import { PARTICIPANT, signIn } from './sign-in';

/** Fake Cevi.DB users 4 and 5, the other members of the test chat; a group needs two. */
const OTHER_MEMBERS = [4, 5];

/** The name of the group chat the tests open. */
export const GROUP_CHAT_NAME = 'Hofleitung Cevi Uster';

/** The fixed id of the group chat; creating a chat is idempotent per id, so reruns reuse it. */
const GROUP_CHAT_ID = '0198f1c2-0000-7000-8000-0000000c4a75';

/** Calls a tRPC mutation the way the app's batch link does, and returns its result. */
const mutate = async <T>(
  client: APIRequestContext,
  procedure: string,
  input: unknown,
): Promise<T> => {
  const response = await client.post(`/api/trpc/${procedure}?batch=1`, {
    data: { 0: superjson.serialize(input) },
  });
  const text = await response.text();
  expect(response.ok(), `${procedure}: ${text}`).toBe(true);
  const [answer] = JSON.parse(text) as [{ result: { data: SuperJSONResult } }];
  return superjson.deserialize<T>(answer.result.data);
};

/** Calls a tRPC query the way the app's batch link does, and returns its result. */
const query = async <T>(client: APIRequestContext, procedure: string): Promise<T> => {
  const input = encodeURIComponent(JSON.stringify({ 0: superjson.serialize({}) }));
  const response = await client.get(`/api/trpc/${procedure}?batch=1&input=${input}`);
  const text = await response.text();
  expect(response.ok(), `${procedure}: ${text}`).toBe(true);
  const [answer] = JSON.parse(text) as [{ result: { data: SuperJSONResult } }];
  return superjson.deserialize<T>(answer.result.data);
};

const signedInAs = async (
  baseURL: string | undefined,
  fakeUser: number,
): Promise<APIRequestContext> => {
  const client = await request.newContext(baseURL === undefined ? {} : { baseURL });
  await signIn(client, fakeUser);
  return client;
};

let prepared: Promise<void> | undefined;

/**
 * Gives user 3 a group chat with a message in it, as a stack that has been in use has; a fresh,
 * seeded stack has none, and a test that opens a chat fails before it starts. The two users
 * become contacts the way people do at camp, through a chat invite: user 4 shows the code, user 3
 * scans it. The chats keep fixed ids, so a rerun reuses them. Once per worker, as invites are
 * rate limited.
 * @param baseURL where the app runs
 */
export const ensureChatWithMessage = (baseURL: string | undefined): Promise<void> => {
  prepared ??= (async (): Promise<void> => {
    const participant = await signedInAs(baseURL, PARTICIPANT);
    try {
      // creating chats and invites is rate limited, so a stack that has the chat keeps it
      const chats = await query<{ id: string; chatType: string; messageCount: number }[]>(
        participant,
        'chat.chats',
      );
      const isReady = chats.some(
        (chat) => chat.id === GROUP_CHAT_ID && chat.chatType === 'GROUP' && chat.messageCount > 1,
      );
      if (isReady) return;

      const memberIds: string[] = [];
      for (const fakeUser of OTHER_MEMBERS) {
        const member = await signedInAs(baseURL, fakeUser);
        try {
          const { token } = await mutate<{ token: string }>(member, 'chat.createChatInvite', {});
          const redeemed = await mutate<{ status: string }>(participant, 'chat.redeemChatInvite', {
            token,
          });
          expect(redeemed.status, 'the chat invite should be redeemed').toBe('redeemed');
          const sessionResponse = await member.get('/api/auth/session');
          const session = (await sessionResponse.json()) as { user: { uuid: string } };
          memberIds.push(session.user.uuid);
        } finally {
          await member.dispose();
        }
      }

      // now contacts, they share a group chat, the kind a Hof has
      await mutate(participant, 'chat.createChat', {
        members: memberIds.map((userId) => ({ userId })),
        chatName: GROUP_CHAT_NAME,
        chatId: GROUP_CHAT_ID,
      });
      await mutate(participant, 'chat.sendMessage', {
        chatId: GROUP_CHAT_ID,
        content: 'Treffpunkt beim Hauptplatz um zehn.',
        timestamp: new Date(),
      });
    } finally {
      await participant.dispose();
    }
  })();
  return prepared;
};
