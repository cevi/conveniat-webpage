export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  name: string;
  lastMessage: Message;
  timestamp: Date;
}

export interface ChatDetail extends Chat {
  messages: Message[];
}

export interface SendMessage {
  chatId: string;
  content: string;
  timestamp: Date;
}
