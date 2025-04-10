export type PublishingStatusType = {
  [locale: string]: {
    published: boolean;
    pendingChanges: boolean;
  };
};
