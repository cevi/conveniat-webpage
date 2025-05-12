export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  name: string;
  lastMessage?: Message;
  lastUpdate: Date;
  unreadCount?: number;
}

export interface ChatDetail extends Chat {
  messages: Message[];
}

export interface SendMessage {
  chatId: string;
  content: string;
  timestamp: Date;
}

export interface OptimisticMessage extends Message {
  isOptimistic?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface ChatDetail {
  id: string;
  name: string;
  messages: Message[];
  participants: Participant[];
  isGroupChat?: boolean;
  lastActivity?: string;
}
