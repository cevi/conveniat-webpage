'use client';

import { sendNotificationToSubscription } from '@/utils/push-notification-api';
import { useDocumentInfo } from '@payloadcms/ui';
import type webpush from 'web-push';

const SendPushNotification: React.FC = () => {
  const { savedDocumentData } = useDocumentInfo();

  // check if the document has data
  const hasData =
    savedDocumentData !== undefined &&
    (savedDocumentData as webpush.PushSubscription | undefined) !== undefined;

  // return a simple button to send a push notification based on the input field "push-content". the field is shown only if the document has data

  const handleSendNotification = async (): Promise<void> => {
    if (!savedDocumentData) return;
    const subscription: webpush.PushSubscription = savedDocumentData as webpush.PushSubscription;

    // Extract user ID for logging
    const userField: unknown = savedDocumentData['user'];
    let userId: string | undefined;
    if (typeof userField === 'string') {
      userId = userField;
    } else if (typeof userField === 'object' && userField !== null && 'id' in userField) {
      userId = (userField as { id: string }).id;
    }

    const success = await sendNotificationToSubscription(
      subscription,
      (document.querySelector('#send-push-content') as HTMLInputElement).value,
      (document.querySelector('#send-push-url') as HTMLInputElement).value,
      userId,
    );
    if (success.success) {
      (document.querySelector('#send-push-content') as HTMLInputElement).value = '';
      (document.querySelector('#send-push-url') as HTMLInputElement).value = '';
      alert('Push notification sent successfully');
    } else {
      alert('Failed to send push notification');
    }
  };

  return (
    <div>
      {hasData && (
        <div>
          <h5>Send Push Notification</h5>
          <input type="text" placeholder="Push Notification Content" id="send-push-content" />
          <input type="text" placeholder="URL to open" id="send-push-url" />
          <button
            onClick={(event) => {
              event.preventDefault();
              void handleSendNotification();
            }}
          >
            Send Push Notification
          </button>
          <hr />
        </div>
      )}
      {!hasData && <p>No data available to send a push notification.</p>}
    </div>
  );
};

export default SendPushNotification;
