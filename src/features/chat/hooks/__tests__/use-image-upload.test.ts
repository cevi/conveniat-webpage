/**
 * @jest-environment jsdom
 */

import { useImageUpload } from '@/features/chat/hooks/use-image-upload';
import { act, renderHook } from '@testing-library/react';
import { TRPCClientError } from '@trpc/client';

const CHAT_ID = 'chat-cevi-uster';

const mockInvalidateChatDetails = jest.fn(() => Promise.resolve());
const mockGetUploadUrl = jest.fn();
const mockSend = jest.fn();

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): unknown => ({
      chat: { chatDetails: { invalidate: mockInvalidateChatDetails } },
    }),
    chat: { getUploadUrl: { useMutation: (): unknown => ({ mutateAsync: mockGetUploadUrl }) } },
  },
}));
jest.mock('@/features/chat/hooks/use-message-send', () => ({
  useMessageSend: (): unknown => ({ mutate: mockSend, isPending: false }),
}));
jest.mock('@/lib/prisma/client', () => ({ MessageType: { IMAGE_MSG: 'IMAGE_MSG' } }));
// the browser's image decoding is not what these tests are about
jest.mock('@/features/chat/utils/prepare-chat-image', () => ({
  prepareChatImage: (file: File): Promise<File> => Promise.resolve(file),
}));

const imagesDisabled = (): TRPCClientError<never> =>
  TRPCClientError.from({
    error: {
      code: -32_003,
      message: 'Images cannot be sent in this chat.',
      data: { code: 'FORBIDDEN', httpStatus: 403, reason: 'imagesDisabled', params: {} },
    },
  });

const photo = (): File => new File(['jpeg'], 'zeltplatz.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  globalThis.fetch = jest.fn(() => Promise.resolve({ ok: true } as Response));
  mockGetUploadUrl.mockResolvedValue({ url: 'https://bucket/put', key: 'chat-images/x.jpg' });
});

describe('useImageUpload', () => {
  it('hands a refusal of the image message to the composer', async () => {
    const onSendError = jest.fn();
    const { result } = renderHook(() => useImageUpload({ chatId: CHAT_ID, onSendError }));

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
    mockGetUploadUrl.mockRejectedValue(imagesDisabled());
    const onError = jest.fn();
    const { result } = renderHook(() => useImageUpload({ chatId: CHAT_ID, onError }));

    let isUploaded = true;
    await act(async () => {
      isUploaded = await result.current.uploadImage(photo());
    });

    expect(isUploaded).toBe(false);
    const [[error]] = onError.mock.calls as [[TRPCClientError<never>]];
    expect(error.data).toMatchObject({ reason: 'imagesDisabled' });
    expect(mockInvalidateChatDetails).toHaveBeenCalledWith({ chatId: CHAT_ID });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
