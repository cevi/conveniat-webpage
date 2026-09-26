import { mapSubscriptionToTestNotificationInput } from '@/features/payload-cms/components/push-notification/subscription-mapper';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import { trpc } from '@/trpc/client';
import { toast } from '@payloadcms/ui';
import type React from 'react';
import { useState } from 'react';
import type webpush from 'web-push';

interface UseSendTestNotificationProperties {
  subscription: webpush.PushSubscription | PushNotificationSubscription;
  userId?: string | undefined;
  sentText: string;
  enterContentErrorText: string;
  unknownErrorText: string;
  sendFailedErrorText: string;
}

/**
 * Form state for sending a test push to one subscription. Reports the outcome as a Payload
 * toast and refreshes the notification history either way, since a failed send is logged too.
 */
export function useSendTestNotification({
  subscription,
  userId,
  sentText,
  enterContentErrorText,
  unknownErrorText,
  sendFailedErrorText,
}: UseSendTestNotificationProperties): {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  isSubmitting: boolean;
  handleSend: () => Promise<void>;
} {
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils();
  const sendTestNotificationMutation = trpc.pushTracking.sendTestNotification.useMutation();

  const handleSend = async (): Promise<void> => {
    if (content.trim() === '') {
      toast.error(enterContentErrorText);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendTestNotificationMutation.mutateAsync({
        subscription: mapSubscriptionToTestNotificationInput(subscription),
        message: content,
        url: url === '' ? undefined : url,
        userId: userId !== undefined && userId !== '' ? userId : undefined,
      });
      await utils.pushTracking.getRecentLogs.invalidate();
      if (result.success) {
        setContent('');
        setUrl('');
        toast.success(sentText);
      } else {
        toast.error(
          result.error !== undefined && result.error !== '' ? result.error : unknownErrorText,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(sendFailedErrorText);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { content, setContent, url, setUrl, isSubmitting, handleSend };
}
