export interface SyncedExternalParticipant {
  participationId: string;
  participantId: string;
  eventId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  fullName: string;
  roleType: string;
  enrollmentDate: string;
  street?: string | null;
  housenumber?: string | null;
  zip?: string | null;
  zipCode?: string | null;
  town?: string | null;
  country?: string | null;
  birthday?: string | null;
  gender?: string | null;
  active: boolean;
}

export interface HitobitoPersonDetails {
  firstName?: string | undefined;
  lastName?: string | undefined;
  street?: string | undefined;
  houseNumber?: string | undefined;
  zip?: string | undefined;
  town?: string | undefined;
  birthday?: string | undefined;
}

export interface HitobitoServicePort {
  fetchParticipations(groupId: string, eventId: string): Promise<SyncedExternalParticipant[]>;
  fetchParticipationAnswers(
    eventId: string,
    participationId: string,
    groupId?: string,
  ): Promise<Record<string, string>>;
  fetchSubgroupLinks(parentGroupId: string): Promise<string[]>;
  fetchEventsForGroup(groupId: string): Promise<Array<{ id: string; name: string }>>;
  fetchPersonDetails(personId: string): Promise<HitobitoPersonDetails | null>;
}
