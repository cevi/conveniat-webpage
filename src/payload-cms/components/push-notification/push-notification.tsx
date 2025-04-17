'use client';

import webpush from 'web-push';
import { sendNotificationToSubscription } from '@/app/(api)/api/push-notifications/actions';
import { useDocumentInfo } from '@payloadcms/ui';

const SendPushNotification: React.FC = () => {
  const { savedDocumentData } = useDocumentInfo();

  // check if the document has data
  const hasData =
    savedDocumentData !== undefined && (savedDocumentData as webpush.PushSubscription);

  // return a simple button to send a push notification based on the input field "push-content". the field is shown only if the document has data

  return (
    <div>
      {hasData && (
        <div>
          <h5>Send Push Notification</h5>
          <input type="text" placeholder="Push Notification Content" />
          <button
            onClick={(event) => {
              event.preventDefault(); // prevent default form submission
              return sendNotificationToSubscription(
                savedDocumentData as webpush.PushSubscription,
                (event.target as HTMLInputElement).value,
              );
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
