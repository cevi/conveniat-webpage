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

/** What a write-back to a single participation answer did. */
export interface ParticipationAnswerUpdate {
  /** False when the Cevi.DB already held the target value, or one that must be kept. */
  changed: boolean;
  /** The answer the form carried before the write. */
  previous: string;
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
  /**
   * The e-mail addresses of everyone holding the Adressverwalter role in a group. They
   * are who a Pflichtangaben reminder for that Hof goes to.
   */
  fetchAddressManagerEmails(groupId: string): Promise<string[]>;
  /**
   * Writes one custom-question answer of a participation back to the Cevi.DB.
   *
   * The question is addressed by its text, because Hitobito numbers the questions per
   * event. The write is read back afterwards and rejected when the new value is not on
   * the form, so a caller may treat a resolved promise as confirmed.
   *
   * @param questionKeywords all of which the question text must contain, case-insensitively
   * @param value the answer to write
   * @param keepValues answers that must not be overwritten; the write is then skipped
   */
  updateParticipationAnswer(
    groupId: string,
    eventId: string,
    participationId: string,
    questionKeywords: string[],
    value: string,
    keepValues?: string[],
  ): Promise<ParticipationAnswerUpdate>;
}
