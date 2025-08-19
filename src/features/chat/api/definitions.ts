import { MessageEventType } from '@/lib/prisma/client';

export const USER_RELEVANT_MESSAGE_EVENTS = [
  MessageEventType.STORED, // show one tick
  MessageEventType.RECEIVED, // show two ticks
  MessageEventType.READ, // show two green ticks
];
