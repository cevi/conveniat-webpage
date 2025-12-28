import { MessageEventType } from '@/lib/prisma/client';
import type { MessageEvent } from '@prisma/client';

export const SYSTEM_SENDER_ID = 'system';

export enum ChatCapability {
  CAN_SEND_MESSAGES = 'CAN_SEND_MESSAGES',
  PICTURE_UPLOAD = 'PICTURE_UPLOAD',
  THREADS = 'THREADS',
}

// Keep constants for backward compatibility if needed, or update usages.
// Since we are refactoring, let's export them as reference to Enum to avoid breaking changes if any,
// or just rely on Enum. User asked to use Enum to derive list.
export const CHAT_CAPABILITY_CAN_SEND_MESSAGES = ChatCapability.CAN_SEND_MESSAGES;
export const CHAT_CAPABILITY_PICTURE_UPLOAD = ChatCapability.PICTURE_UPLOAD;

export const SYSTEM_MSG_TYPE_EMERGENCY_ALERT = 'emergency_alert';

export enum ChatStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export const USER_RELEVANT_MESSAGE_EVENTS = [
  MessageEventType.STORED, // show one tick
  MessageEventType.RECEIVED, // show two ticks
  MessageEventType.READ, // show two green ticks
];

export const getStatusFromMessageEvents = (messageEvents: MessageEvent[]): MessageEventType => {
  if (messageEvents.some((event) => event.type === MessageEventType.READ)) {
    return MessageEventType.READ;
  }

  if (messageEvents.some((event) => event.type === MessageEventType.RECEIVED)) {
    return MessageEventType.RECEIVED;
  }

  if (messageEvents.some((event) => event.type === MessageEventType.STORED)) {
    return MessageEventType.STORED;
  }

  return MessageEventType.CREATED;
};
