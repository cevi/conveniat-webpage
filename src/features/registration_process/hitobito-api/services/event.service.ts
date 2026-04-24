import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import {
  EventParticipationListResponseSchema,
  type EventParticipationWithPersonSchema,
  type IncludedPersonSchema,
} from '@/features/registration_process/hitobito-api/event-participation-schemas';
import type { Logger, RoleResource } from '@/features/registration_process/hitobito-api/types';
import type { z } from 'zod';

export interface FindParticipationParameters {
  personId: string;
  eventId: string;
  options?: {
    groupId?: string;
    searchName?: string;
  };
}

export interface AddPersonToEventParameters {
  personId: string;
  personLabel: string;
  groupId: string;
  eventId: string;
}

export interface UpdateParticipationParameters {
  participationId: string;
  eventId: string;
  data: {
    answers?: Record<string, string | string[]>;
    internalComment?: string;
  };
}

export class EventService {
  constructor(
    private readonly client: HitobitoClient,
    private readonly logger?: Logger,
  ) {}

  /**
   * Find participation ID (tries official API first, then falls back to internal JSON)
   */
  async findParticipationId({
    personId,
    eventId,
    options,
  }: FindParticipationParameters): Promise<string | undefined> {
    // 1. Try official API
    const officialId = await this.findParticipationIdByApi(personId, eventId);
    if (officialId !== undefined && officialId.length > 0) return officialId;

    // 2. Try internal JSON if options provided
    if (options?.groupId !== undefined && options.searchName !== undefined) {
      return await this.findParticipationIdByInternalJson(
        personId,
        options.groupId,
        eventId,
        options.searchName,
      );
    }

    return undefined;
  }

  /**
   * Internal: Find participation ID via official API
   */
  private async findParticipationIdByApi(
    personId: string,
    eventId: string,
  ): Promise<string | undefined> {
    const response = await this.client.apiRequest<{ data: RoleResource[] }>('GET', '/api/roles', {
      params: {
        'filter[person_id][eq]': personId,
        'filter[group_id][eq]': eventId,
      },
    });

    if (response.data.length > 0) {
      const now = new Date().setHours(0, 0, 0, 0);
      const activeRole = response.data.find((role: RoleResource) => {
        const endOn = role.attributes.end_on;
        return (
          endOn === null || endOn === undefined || endOn === '' || new Date(endOn).getTime() >= now
        );
      });
      const role = activeRole ?? response.data[0];
      if (role === undefined) return undefined;
      return String(role.id);
    }
    return undefined;
  }

  /**
   * Internal: Find participation ID via internal JSON (fallback/idempotency)
   */
  private async findParticipationIdByInternalJson(
    personId: string,
    groupId: string,
    eventId: string,
    searchName: string,
  ): Promise<string | undefined> {
    const path = `/groups/${groupId}/events/${eventId}/participations.json`;
    const { response, body } = await this.client.frontendRequest('GET', path, {
      params: { returning: 'true', page: '1', q: searchName },
    });

    if (!response.ok) {
      throw new Error(
        `findParticipationIdByInternalJson failed with status ${response.status} at ${path}`,
      );
    }

    const data = JSON.parse(body) as {
      event_participations?: Array<{
        id: string;
        links: { person: string };
      }>;
    };

    const match = data.event_participations?.find((p) => String(p.links.person) === personId);
    return match?.id;
  }

  /**
   * Add person to event via frontend scraping
   */
  async addPersonToEvent({
    personId,
    personLabel,
    groupId,
    eventId,
  }: AddPersonToEventParameters): Promise<string | undefined> {
    const formPath = `/groups/${groupId}/events/${eventId}/roles/new`;
    const params = { 'event_role[type]': 'Event::Role::Participant' };

    try {
      const { body: postBody, finalUrl } = await this.client.submitRailsForm({
        getFormUrl: formPath,
        postUrl: `/groups/${groupId}/events/${eventId}/roles`,
        params,
        formData: {
          'event_role[type]': 'Event::Role::Participant',
          'event_role[person_id]': personId,
          'event_role[person]': personLabel,
          'event_role[label]': '',
          button: '',
        },
      });

      // Extract ID from redirect URL or body
      if (finalUrl !== '' && finalUrl.includes('/participations/')) {
        const id = finalUrl.split('/participations/')[1]?.split('?')[0];
        if (id !== undefined && /^\d+$/.test(id)) return id;
      }

      const match = postBody.match(/\/participations\/(\d+)/);
      if (match === null) return undefined;
      return match[1];
    } catch (error) {
      this.logger?.warn(`addPersonToEvent failed: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Update participation details
   */
  async updateParticipation({
    participationId,
    eventId,
    data,
  }: UpdateParticipationParameters): Promise<void> {
    const editPath = `/events/${eventId}/participations/${participationId}/edit`;

    try {
      const formData: Record<string, string | string[]> = {};

      if (data.answers) {
        for (const [qId, answer] of Object.entries(data.answers)) {
          if (Array.isArray(answer)) {
            formData[`participation[answer_${qId}][]`] = answer.map(String);
          } else {
            formData[`participation[answer_${qId}]`] = String(answer);
          }
        }
      }

      if (data.internalComment !== undefined && data.internalComment !== '') {
        formData['participation[internal_comment]'] = data.internalComment;
      }

      await this.client.submitRailsForm({
        getFormUrl: editPath,
        postUrl: `/events/${eventId}/participations/${participationId}`,
        method: 'PATCH',
        extractExtraFields: true,
        formData,
      });
    } catch (error) {
      this.logger?.warn(`updateParticipation failed: ${String(error)}`);
      throw error;
    }
  }

  /**
   * List all participations for an event using the official JSON:API.
   *
   * Uses GET /api/event_participations with filter[event_id][eq] and
   * include=participant,roles to sideload person data and role types.
   * Handles pagination automatically via links.next.
   *
   * This replaces any browser-cookie-based scraping for reading event participants.
   */
  async listEventParticipations(
    eventId: string,
  ): Promise<z.infer<typeof EventParticipationWithPersonSchema>[]> {
    const allParticipations: z.infer<typeof EventParticipationWithPersonSchema>[] = [];
    const includedPeople = new Map<string, z.infer<typeof IncludedPersonSchema>['attributes']>();
    const roleTypes = new Map<string, string>(); // participationId -> roleType

    let nextUrl: string | null = `/api/event_participations`;
    const baseParameters: Record<string, string> = {
      'filter[event_id][eq]': eventId,
      include: 'participant,roles',
    };

    let isFirstPage = true;

    while (nextUrl !== null) {
      const response = await this.client.apiRequest<unknown>(
        'GET',
        nextUrl,
        isFirstPage ? { params: baseParameters } : {},
      );

      const parsed = EventParticipationListResponseSchema.safeParse(response);
      if (!parsed.success) {
        this.logger?.error(
          `Failed to parse event_participations response: ${parsed.error.message}`,
        );
        break;
      }

      // Collect included people resources
      if (parsed.data.included) {
        for (const included of parsed.data.included) {
          if (included.type === 'people') {
            includedPeople.set(included.id, included.attributes);
          } else {
            // event_roles type (from discriminated union)
            const participationId = String(included.attributes.participation_id ?? '');
            if (participationId.length > 0 && included.attributes.type) {
              roleTypes.set(participationId, included.attributes.type);
            }
          }
        }
      }

      // Process participation data
      for (const participation of parsed.data.data) {
        const participantId =
          participation.relationships?.participant?.data?.id ??
          String(participation.attributes.participant_id);

        const person = includedPeople.get(participantId);
        const firstName = person?.first_name ?? '';
        const lastName = person?.last_name ?? '';
        const fullName = `${firstName} ${lastName}`.trim() || `Person ${participantId}`;

        const roleType = roleTypes.get(participation.id) ?? 'unknown';

        allParticipations.push({
          participationId: participation.id,
          participantId,
          eventId: String(participation.attributes.event_id),
          fullName,
          roleType,
          enrollmentDate: participation.attributes.created_at ?? new Date().toISOString(),
          active: participation.attributes.active ?? true,
        });
      }

      // eslint-disable-next-line unicorn/no-null -- API may return null for last page
      nextUrl = parsed.data.links?.next ?? null;
      isFirstPage = false;
    }

    this.logger?.info(`Fetched ${allParticipations.length} participations for event ${eventId}`);
    return allParticipations;
  }
}
