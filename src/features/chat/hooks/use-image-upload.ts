import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { MessageType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import { useCallback, useState } from 'react';

interface UseImageUploadOptions {
  chatId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  uploadUrlMutation?: {
    mutateAsync: (args: {
      chatId: string;
      fileName: string;
      contentType: string;
    }) => Promise<{ url: string; key: string }>;
  };
  sendMessageMutation?: {
    mutate: (args: {
      chatId: string;
      content: string;
      type: MessageType;
      timestamp?: Date;
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
  uploadImage: (file: File) => Promise<void>;
  isUploading: boolean;
  isPending: boolean;
} => {
  const [isUploading, setIsUploading] = useState(false);
  const defaultUploadUrlMutation = trpc.chat.getUploadUrl.useMutation();
  const defaultSendMessageMutation = useMessageSend();

  const getUploadUrlMutation = customUploadUrlMutation ?? defaultUploadUrlMutation;
  const sendMessageMutation = customSendMessageMutation ?? defaultSendMessageMutation;

  const uploadImage = useCallback(
    async (file: File): Promise<void> => {
      try {
        setIsUploading(true);

        // 1. Get pre-signed URL
        const { url, key } = await getUploadUrlMutation.mutateAsync({
          chatId,
          fileName: file.name,
          contentType: file.type,
        });

        // 2. Upload directly to S3
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
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
        });

        onSuccess?.();
      } catch (error) {
        const error_ = error instanceof Error ? error : new Error('Unknown upload error');
        console.error('Failed to upload image:', error_);
        onError?.(error_);
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
