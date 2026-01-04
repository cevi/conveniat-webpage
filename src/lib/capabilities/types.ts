export enum CapabilityAction {
  Send = 'send',
  Upload = 'upload',
  View = 'view',
  Create = 'create',
}

export enum CapabilitySubject {
  Messages = 'Messages',
  Images = 'Images',
  Chat = 'Chat',
  Threads = 'Threads',
}

export interface CapabilityContext {
  chatId?: string;
}

export interface CapabilitiesMap {
  [CapabilitySubject.Messages]: CapabilityAction.Send | CapabilityAction.View;
  [CapabilitySubject.Images]: CapabilityAction.Upload;
  [CapabilitySubject.Chat]: CapabilityAction.Create;
  [CapabilitySubject.Threads]: CapabilityAction.Create;
}

export interface Capability {
  readonly subject: CapabilitySubject;
  can(action: CapabilityAction, context?: CapabilityContext): Promise<boolean>;
}
