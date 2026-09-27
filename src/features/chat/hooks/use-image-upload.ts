import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { generateMessageId } from '@/features/chat/utils';
import type { ChatImageUploadInput } from '@/lib/chat-images';
import { CHAT_IMAGE_MAX_BYTES, isChatImageContentType } from '@/lib/chat-images';
import { MessageType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import { useCallback, useState } from 'react';

interface UseImageUploadOptions {
  chatId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  uploadUrlMutation?: {
    mutateAsync: (args: ChatImageUploadInput) => Promise<{ url: string; key: string }>;
  };
  sendMessageMutation?: {
    mutate: (args: {
      chatId: string;
      content: string;
      type: MessageType;
      parentId?: string | undefined;
      timestamp?: Date;
      messageId?: string;
    }) => void;
    isPending: boolean;
  };
}

export const useImageUpload = ({
  chatId,
  onSuccess,
  onError,
  uploadUrlMutation: customUploadUrlMutation,
  sendMessageMutation: customSendMessageMutation,
}: UseImageUploadOptions): {
  /** Resolves to whether the image was uploaded and its message handed to the send queue. */
  uploadImage: (file: File, parentId?: string) => Promise<boolean>;
  isUploading: boolean;
  isPending: boolean;
} => {
  const [isUploading, setIsUploading] = useState(false);
  const defaultUploadUrlMutation = trpc.chat.getUploadUrl.useMutation();
  const defaultSendMessageMutation = useMessageSend();

  const getUploadUrlMutation = customUploadUrlMutation ?? defaultUploadUrlMutation;
  const sendMessageMutation = customSendMessageMutation ?? defaultSendMessageMutation;

  const uploadImage = useCallback(
    async (file: File, parentId?: string): Promise<boolean> => {
      try {
        setIsUploading(true);

        // The server refuses these too; checking here saves the round trip.
        const contentType = file.type;
        if (!isChatImageContentType(contentType)) {
          throw new Error(`Unsupported image type: ${contentType}`);
        }
        if (file.size > CHAT_IMAGE_MAX_BYTES) {
          throw new Error('Image is too large');
        }

        // 1. Get a pre-signed URL, valid only for this exact type and size
        const { url, key } = await getUploadUrlMutation.mutateAsync({
          chatId,
          contentType,
          contentLength: file.size,
        });

        // 2. Upload directly to S3
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': contentType,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload to S3 failed');
        }

        // 3. Send message with the S3 key
        sendMessageMutation.mutate({
          chatId,
          content: key,
          timestamp: new Date(),
          type: MessageType.IMAGE_MSG,
          parentId,
          messageId: generateMessageId(),
        });

        onSuccess?.();
        return true;
      } catch (error) {
        const error_ = error instanceof Error ? error : new Error('Unknown upload error');
        console.error('Failed to upload image:', error_);
        onError?.(error_);
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [chatId, getUploadUrlMutation, sendMessageMutation, onSuccess, onError],
  );

  return {
    uploadImage,
    isUploading,
    isPending: isUploading || sendMessageMutation.isPending,
  };
};
