/**
 * @jest-environment jsdom
 */

import { useImageUpload } from '@/features/chat/hooks/use-image-upload';
import type { ProcedureHandler } from '@/trpc/test-trpc';
import { createTestTrpc, testTrpcError } from '@/trpc/test-trpc';
import { act, renderHook } from '@testing-library/react';
import type { TRPCClientError } from '@trpc/client';

const CHAT_ID = 'chat-cevi-uster';

const mockSend = jest.fn();

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/features/chat/hooks/use-message-send', () => ({
  useMessageSend: (): unknown => ({ mutate: mockSend, isPending: false }),
}));
// the browser's image decoding is not what these tests are about
jest.mock('@/features/chat/utils/prepare-chat-image', () => ({
  prepareChatImage: (file: File): Promise<File> => Promise.resolve(file),
}));

const imagesDisabled = (): Error =>
  testTrpcError('FORBIDDEN', { httpStatus: 403, reason: 'imagesDisabled', params: {} });

const uploadUrl: ProcedureHandler = () => ({
  url: 'https://bucket/put',
  key: 'chat-images/x.jpg',
});

const photo = (): File => new File(['jpeg'], 'zeltplatz.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  globalThis.fetch = jest.fn(() => Promise.resolve({ ok: true } as Response));
});

describe('useImageUpload', () => {
  it('hands a refusal of the image message to the composer', async () => {
    const { wrapper } = createTestTrpc({ 'chat.getUploadUrl': uploadUrl });
    const onSendError = jest.fn();
    const { result } = renderHook(() => useImageUpload({ chatId: CHAT_ID, onSendError }), {
      wrapper,
    });

    let isUploaded = false;
    await act(async () => {
      isUploaded = await result.current.uploadImage(photo());
    });
    const [[, options]] = mockSend.mock.calls as [[unknown, { onError: (error: unknown) => void }]];
    const refusal = imagesDisabled();
    options.onError(refusal);

    expect(isUploaded).toBe(true);
    expect(onSendError).toHaveBeenCalledWith(refusal);
  });

  it('refreshes the chat when the server no longer takes images, and sends nothing', async () => {
    const { trpc, queryClient, calls, wrapper } = createTestTrpc({
      'chat.getUploadUrl': () => {
        throw imagesDisabled();
      },
    });
    const chatDetailsKey = trpc.chat.chatDetails.queryKey({ chatId: CHAT_ID });
    queryClient.setQueryData(chatDetailsKey, { id: CHAT_ID } as never);
    const onError = jest.fn();
    const { result } = renderHook(() => useImageUpload({ chatId: CHAT_ID, onError }), {
      wrapper,
    });

    let isUploaded = true;
    await act(async () => {
      isUploaded = await result.current.uploadImage(photo());
    });

    expect(isUploaded).toBe(false);
    const [[error]] = onError.mock.calls as [[TRPCClientError<never>]];
    expect(error.data).toMatchObject({ reason: 'imagesDisabled' });
    expect(calls).toEqual([
      {
        path: 'chat.getUploadUrl',
        input: { chatId: CHAT_ID, contentType: 'image/jpeg', contentLength: 4 },
      },
    ]);
    expect(queryClient.getQueryState(chatDetailsKey)?.isInvalidated).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
