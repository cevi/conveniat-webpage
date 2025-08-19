import { MessageEventType, type MessageEvent } from '@prisma/client';

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
