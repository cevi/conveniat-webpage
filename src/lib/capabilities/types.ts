import type { Chat } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';

export enum CapabilityAction {
  Send = 'send',
  Upload = 'upload',
  Create = 'create',
}

export enum CapabilitySubject {
  Messages = 'Messages',
  Images = 'Images',
  Chat = 'Chat',
  Threads = 'Threads',
}

export interface CapabilityContext {
  /**
   * The caller's client. Inside a transaction this is the transaction client, so a check
   * reads on the connection the caller already holds instead of waiting for a second one.
   */
  prisma: PrismaClientOrTransaction;
  chatId?: string;
  /**
   * The chat behind `chatId`, for a caller that has already loaded it, `null` when it found
   * none. The check then decides on this instead of reading the chat itself.
   */
  chat?: CapabilityChat | null;
}

/** The columns of a chat that the capability checks decide on. */
export type CapabilityChat = Pick<Chat, 'capabilities' | 'status' | 'archivedAt'>;

export interface CapabilitiesMap {
  [CapabilitySubject.Messages]: CapabilityAction.Send;
  [CapabilitySubject.Images]: CapabilityAction.Upload;
  [CapabilitySubject.Chat]: CapabilityAction.Create;
  [CapabilitySubject.Threads]: CapabilityAction.Create;
}

export interface Capability {
  readonly subject: CapabilitySubject;
  can(action: CapabilityAction, context: CapabilityContext): Promise<boolean>;
}
