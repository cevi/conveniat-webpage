export const SYSTEM_SENDER_ID = 'system';

export enum ChatCapability {
  CAN_SEND_MESSAGES = 'CAN_SEND_MESSAGES',
  PICTURE_UPLOAD = 'PICTURE_UPLOAD',
  THREADS = 'THREADS',
}

export const CHAT_CAPABILITY_CAN_SEND_MESSAGES = ChatCapability.CAN_SEND_MESSAGES;
export const CHAT_CAPABILITY_PICTURE_UPLOAD = ChatCapability.PICTURE_UPLOAD;

export const SYSTEM_MSG_TYPE_EMERGENCY_ALERT = 'emergency_alert';

export type ChatStatus = 'OPEN' | 'CLOSED';
export const ChatStatus = {
  OPEN: 'OPEN' as const,
  CLOSED: 'CLOSED' as const,
};

export type MessageEventType = 'CREATED' | 'STORED' | 'DISTRIBUTED' | 'RECEIVED' | 'READ';
export const MessageEventType = {
  CREATED: 'CREATED' as const,
  STORED: 'STORED' as const,
  DISTRIBUTED: 'DISTRIBUTED' as const,
  RECEIVED: 'RECEIVED' as const,
  READ: 'READ' as const,
};

export const USER_RELEVANT_MESSAGE_EVENTS: MessageEventType[] = [
  MessageEventType.STORED, // show one tick
  MessageEventType.RECEIVED, // show two ticks
  MessageEventType.READ, // show two green ticks
];

export const getStatusFromMessageEvents = (
  messageEvents: Array<{ type: MessageEventType }>,
): MessageEventType => {
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

export const LARGE_CHAT_THRESHOLD = 128;
