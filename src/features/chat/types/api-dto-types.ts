export enum MessageStatusDto {
  CREATED = 'CREATED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

/** @deprecated */
export interface MessageDto {
  id: string;
  // undefined for system messages
  senderId: string | undefined;
  content: string;
  timestamp: Date;
  status: MessageStatusDto;
}

/** @deprecated */
export interface ChatDto {
  id: string;
  name: string;
  lastMessage?: MessageDto;
  lastUpdate: Date;
  unreadCount: number;
}
