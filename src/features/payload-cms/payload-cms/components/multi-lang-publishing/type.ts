export interface PublishingStatusType {
  [locale: string]: {
    published: boolean;
    pendingChanges: boolean;
  };
}
