import { mapSubscriptionToTestNotificationInput } from '@/features/payload-cms/components/push-notification/subscription-mapper';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import { trpc } from '@/trpc/client';
import type React from 'react';
import { useState } from 'react';
import type webpush from 'web-push';

interface UseSendTestNotificationProperties {
  subscription: webpush.PushSubscription | PushNotificationSubscription;
  userId?: string | undefined;
  onClose: () => void;
  enterContentErrorText: string;
  unknownErrorText: string;
  sendFailedErrorText: string;
}

export function useSendTestNotification({
  subscription,
  userId,
  onClose,
  enterContentErrorText,
  unknownErrorText,
  sendFailedErrorText,
}: UseSendTestNotificationProperties): {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  isSubmitting: boolean;
  error: string | undefined;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  handleSend: () => Promise<void>;
} {
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const utils = trpc.useUtils();
  const sendTestNotificationMutation = trpc.pushTracking.sendTestNotification.useMutation();

  const handleSend = async (): Promise<void> => {
    if (content.trim() === '') {
      setError(enterContentErrorText);
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      const result = await sendTestNotificationMutation.mutateAsync({
        subscription: mapSubscriptionToTestNotificationInput(subscription),
        message: content,
        url: url === '' ? undefined : url,
        userId: userId !== undefined && userId !== '' ? userId : undefined,
      });
      if (result.success) {
        setContent('');
        setUrl('');
        await utils.pushTracking.getRecentLogs.invalidate();
        onClose();
      } else {
        await utils.pushTracking.getRecentLogs.invalidate();
        setError(
          result.error !== undefined && result.error !== '' ? result.error : unknownErrorText,
        );
      }
    } catch (error_) {
      console.error(error_);
      setError(sendFailedErrorText);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    content,
    setContent,
    url,
    setUrl,
    isSubmitting,
    error,
    setError,
    handleSend,
  };
}
