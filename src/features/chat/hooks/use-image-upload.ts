import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { generateMessageId } from '@/features/chat/utils';
import { prepareChatImage } from '@/features/chat/utils/prepare-chat-image';
import type { ChatImageUploadInput } from '@/lib/chat-images';
import { CHAT_IMAGE_MAX_BYTES, isChatImageContentType } from '@/lib/chat-images';
import { MessageType } from '@/lib/prisma/client';
import { useTRPC } from '@/trpc/client';
import { errorReasonOf } from '@/utils/user-error-message';
import { useCallback, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseImageUploadOptions {
  chatId: string;
  onSuccess?: () => void;
  /** The upload failed; the image was not sent. */
  onError?: (error: Error) => void;
  /** The upload went through, but the server refused the message that shows it. */
  onSendError?: (error: unknown) => void;
  uploadUrlMutation?: {
    mutateAsync: (args: ChatImageUploadInput) => Promise<{ url: string; key: string }>;
  };
  sendMessageMutation?: {
    mutate: (
      args: {
        chatId: string;
        content: string;
        type: MessageType;
        parentId?: string | undefined;
        timestamp?: Date;
        messageId?: string;
      },
      options?: { onError?: (error: unknown) => void },
    ) => void;
    isPending: boolean;
  };
}

export const useImageUpload = ({
  chatId,
  onSuccess,
  onError,
  onSendError,
  uploadUrlMutation: customUploadUrlMutation,
  sendMessageMutation: customSendMessageMutation,
}: UseImageUploadOptions): {
  /** Resolves to whether the image was uploaded and its message handed to the send queue. */
  uploadImage: (file: File, parentId?: string) => Promise<boolean>;
  isUploading: boolean;
  isPending: boolean;
} => {
  const trpc = useTRPC();
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const defaultUploadUrlMutation = useMutation(trpc.chat.getUploadUrl.mutationOptions());
  const defaultSendMessageMutation = useMessageSend();

  const getUploadUrlMutation = customUploadUrlMutation ?? defaultUploadUrlMutation;
  const sendMessageMutation = customSendMessageMutation ?? defaultSendMessageMutation;

  const uploadImage = useCallback(
    async (file: File, parentId?: string): Promise<boolean> => {
      try {
        setIsUploading(true);

        // shrunk to a JPEG of at most 1600 pixels; HEIC becomes JPEG, a GIF goes as picked
        const image = await prepareChatImage(file);

        // The server refuses these too; checking here saves the round trip.
        const contentType = image.type;
        if (!isChatImageContentType(contentType)) {
          throw new Error(`Unsupported image type: ${contentType}`);
        }
        if (image.size > CHAT_IMAGE_MAX_BYTES) {
          throw new Error('Image is too large');
        }

        // 1. Get a pre-signed URL, valid only for this exact type and size
        const { url, key } = await getUploadUrlMutation.mutateAsync({
          chatId,
          contentType,
          contentLength: image.size,
        });

        // 2. Upload directly to S3
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: image,
          headers: {
            'Content-Type': contentType,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload to S3 failed');
        }

        // 3. Send message with the S3 key
        sendMessageMutation.mutate(
          {
            chatId,
            content: key,
            timestamp: new Date(),
            type: MessageType.IMAGE_MSG,
            parentId,
            messageId: generateMessageId(),
          },
          { onError: (error: unknown) => onSendError?.(error) },
        );

        onSuccess?.();
        return true;
      } catch (error) {
        const error_ = error instanceof Error ? error : new Error('Unknown upload error');
        console.error('Failed to upload image:', error_);
        // the chat details on the phone said images were allowed; the attach button follows
        if (errorReasonOf(error)?.reason === 'imagesDisabled') {
          queryClient
            .invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId }))
            .catch(console.error);
        }
        onError?.(error_);
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [
      chatId,
      getUploadUrlMutation,
      sendMessageMutation,
      onSuccess,
      onError,
      onSendError,
      queryClient,
      trpc,
    ],
  );

  return {
    uploadImage,
    isUploading,
    isPending: isUploading || sendMessageMutation.isPending,
  };
};
