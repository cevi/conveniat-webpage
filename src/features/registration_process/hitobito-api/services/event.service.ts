import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import {
  EventParticipationListResponseSchema,
  type EventParticipationWithPersonSchema,
  type IncludedPersonSchema,
} from '@/features/registration_process/hitobito-api/event-participation-schemas';
import type { Logger, RoleResource } from '@/features/registration_process/hitobito-api/types';
import { traceMethod, withRetries, withSpan } from '@/utils/tracing-helpers';
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

function listEventParticipationsSpanName(groupId: string, eventId: string): string {
  return `Hitobito.listEventParticipations:group:${groupId}:event:${eventId}`;
}

function listEventParticipationsAttributes(
  groupId: string,
  eventId: string,
): Record<string, string> {
  return {
    'group.id': groupId,
    'event.id': eventId,
  };
}

function fetchRestrictedPersonDetailsSpanName(
  groupId: string,
  eventId: string,
  participationId: string,
): string {
  return `Hitobito.fetchRestrictedPersonDetails:group:${groupId}:event:${eventId}:participation:${participationId}`;
}

function fetchRestrictedPersonDetailsAttributes(
  groupId: string,
  eventId: string,
  participationId: string,
): Record<string, string> {
  return {
    'group.id': groupId,
    'event.id': eventId,
    'participation.id': participationId,
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
      headers:
        this.client.config.apiToken.length > 0 ? { 'X-TOKEN': this.client.config.apiToken } : {},
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
   * Falls back to legacy JSON API or HTML scraping if the participant profile is restricted.
   */
  listEventParticipations = traceMethod(
    listEventParticipationsSpanName,
    // eslint-disable-next-line unicorn/consistent-function-scoping
    async function (
      this: EventService,
      groupId: string,
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
              if (
                participationId.length > 0 &&
                included.attributes.type !== undefined &&
                included.attributes.type !== ''
              ) {
                roleTypes.set(participationId, included.attributes.type);
              }
            }
          }
        }

        // Process participation data
        for (const participation of parsed.data.data) {
          let participantId = '';
          const participantData = participation.relationships?.participant?.data;
          if (participantData) {
            participantId = String(participantData.id);
          }

          let person = participantId.length > 0 ? includedPeople.get(participantId) : undefined;

          // Fallback: If relationship data is null/restricted, fetch via fallback methods
          if (!participantData || !person) {
            const fallbackPerson = await this.fetchRestrictedPersonDetails(
              groupId,
              eventId,
              participation.id,
            );
            if (fallbackPerson) {
              participantId = fallbackPerson.personId;
              person = fallbackPerson.attributes;
              includedPeople.set(participantId, person);
            }
          }

          const firstName = person?.first_name ?? '';
          const lastName = person?.last_name ?? '';
          const nickname = person?.nickname ?? '';
          const trimmedName = `${firstName} ${lastName}`.trim();
          const fullName = trimmedName.length > 0 ? trimmedName : `Person ${participantId}`;

          const roleType = roleTypes.get(participation.id) ?? 'unknown';

          allParticipations.push({
            participationId: participation.id,
            participantId,
            eventId: String(participation.attributes.event_id ?? eventId),
            firstName,
            lastName,
            nickname,
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
    },
    {
      getAttributes: listEventParticipationsAttributes,
    },
  );

  /**
   * Fetches the details of a restricted person profile using fallback methods.
   */
  private fetchRestrictedPersonDetails = traceMethod(
    fetchRestrictedPersonDetailsSpanName,
    // eslint-disable-next-line unicorn/consistent-function-scoping
    async function (
      this: EventService,
      groupId: string,
      eventId: string,
      participationId: string,
    ): Promise<
      | {
          personId: string;
          attributes: {
            first_name: string;
            last_name: string;
            nickname: string;
            email: string | undefined;
            street: string | undefined;
            housenumber: string | undefined;
            zip_code: string | undefined;
            town: string | undefined;
            country: string | undefined;
            birthday: string | undefined;
          };
        }
      | undefined
    > {
      // 1. First level fallback: Try the legacy JSON API endpoint for the single participation (with retries and tracing)
      try {
        const legacyPerson = await withRetries(
          `Hitobito.fetchRestrictedPersonDetails:legacyJsonAttempt`,
          async () => {
            const legacyJsonPath = `/groups/${groupId}/events/${eventId}/participations/${participationId}.json`;
            const { response: legacyResponse, body: legacyBody } =
              await this.client.frontendRequest('GET', legacyJsonPath, {
                headers:
                  this.client.config.apiToken.length > 0
                    ? { 'X-TOKEN': this.client.config.apiToken }
                    : {},
              });

            if (!legacyResponse.ok) {
              throw new Error(`Legacy JSON API response error: ${legacyResponse.status}`);
            }

            const parsed = JSON.parse(legacyBody) as {
              event_participations?: Array<{
                links?: { person?: string | number };
                first_name?: string | null;
                last_name?: string | null;
                nickname?: string | null;
                email?: string | null;
                street?: string | null;
                housenumber?: string | null;
                zip_code?: string | null;
                town?: string | null;
                country?: string | null;
                birthday?: string | null;
              }>;
            };

            const firstParticipation = parsed.event_participations?.[0];
            const personIdRaw = firstParticipation?.links?.person;
            if (firstParticipation && personIdRaw !== undefined) {
              const personId = String(personIdRaw);
              if (personId !== '') {
                return {
                  personId,
                  attributes: {
                    first_name: firstParticipation.first_name ?? '',
                    last_name: firstParticipation.last_name ?? '',
                    nickname: firstParticipation.nickname ?? '',
                    email: firstParticipation.email ?? undefined,
                    street: firstParticipation.street ?? undefined,
                    housenumber: firstParticipation.housenumber ?? undefined,
                    zip_code: firstParticipation.zip_code ?? undefined,
                    town: firstParticipation.town ?? undefined,
                    country: firstParticipation.country ?? undefined,
                    birthday: firstParticipation.birthday ?? undefined,
                  },
                };
              }
            }
            throw new Error('Legacy JSON API response did not contain expected fields');
          },
          {
            maxAttempts: 3,
            backoffMs: (attempt) => (attempt - 1) * 300,
            onAttemptSpan: (span, _attempt, result) => {
              if (result) {
                span.setAttribute('person.id', result.personId);
              }
            },
            ...(this.logger ? { logger: this.logger } : {}),
          },
        );

        this.logger?.info(
          `Successfully retrieved restricted person ${legacyPerson.personId} details via legacy JSON fallback`,
        );
        return legacyPerson;
      } catch (error) {
        this.logger?.warn(
          `First level fallback (legacy JSON) failed after 3 attempts for participation ${participationId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // 2. Second level fallback: Scrape HTML show page -> get person ID & group ID -> GET edit HTML form -> parse inputs
      try {
        return await withSpan(
          `Hitobito.fetchRestrictedPersonDetails:htmlScrapeAttempt`,
          async (htmlSpan) => {
            const showPath = `/groups/${groupId}/events/${eventId}/participations/${participationId}`;
            const { response: showResponse, body: showHtml } = await this.client.frontendRequest(
              'GET',
              showPath,
            );

            if (!showResponse.ok) {
              this.logger?.warn(
                `Second level fallback failed to fetch show page ${showPath}: ${showResponse.status}`,
              );
              return;
            }

            // Try to find the person ID and group ID in edit link or role links
            const editLinkMatch = showHtml.match(/\/groups\/(\d+)\/people\/(\d+)\/edit/);
            let personGroupId = editLinkMatch?.[1];
            let personId = editLinkMatch?.[2];

            if (
              personId === undefined ||
              personId === '' ||
              personGroupId === undefined ||
              personGroupId === ''
            ) {
              const roleAddMatch = showHtml.match(/person_id(?:%5D|\])=(\d+)/);
              const matchedPersonId = roleAddMatch?.[1];
              if (matchedPersonId !== undefined && matchedPersonId !== '') {
                personId = matchedPersonId;
                personGroupId = '1'; // Default to root group if not specified
              }
            }

            if (
              personId === undefined ||
              personId === '' ||
              personGroupId === undefined ||
              personGroupId === ''
            ) {
              this.logger?.warn(
                `Could not extract person ID or group ID from show HTML for participation ${participationId}`,
              );
              return;
            }

            htmlSpan.setAttributes({
              'person.id': personId,
              'person_group.id': personGroupId,
            });

            const editPath = `/groups/${personGroupId}/people/${personId}/edit`;
            const { response: editResponse, body: editHtml } = await this.client.frontendRequest(
              'GET',
              editPath,
            );

            if (!editResponse.ok) {
              this.logger?.warn(
                `Second level fallback failed to fetch edit page ${editPath}: ${editResponse.status}`,
              );
              return;
            }

            const fields = this.parseEditPageHtml(editHtml);
            this.logger?.info(
              `Successfully scraped restricted person ${personId} details via HTML scraping fallback`,
            );

            const getField = (name: string): string | undefined => {
              const val = fields[name];
              return val !== undefined && val !== '' ? val : undefined;
            };

            return {
              personId,
              attributes: {
                first_name: fields['first_name'] ?? '',
                last_name: fields['last_name'] ?? '',
                nickname: fields['nickname'] ?? '',
                email: getField('email'),
                street: getField('street'),
                housenumber: getField('housenumber'),
                zip_code: getField('zip_code'),
                town: getField('town'),
                country: getField('country'),
                birthday: getField('birthday'),
              },
            };
          },
        );
      } catch (error) {
        this.logger?.error(
          `Second level fallback failed for participation ${participationId}: ${String(error)}`,
        );
      }

      return;
    },
    {
      getAttributes: fetchRestrictedPersonDetailsAttributes,
    },
  );

  /**
   * Helper to parse form inputs from the person edit HTML page.
   */
  private parseEditPageHtml(html: string): Record<string, string> {
    const inputRegex = /<(input|textarea|select)[^>]*name="person\[([^\]]+)\]"[^>]*>/g;
    const fields: Record<string, string> = {};

    let match = inputRegex.exec(html);
    while (match !== null) {
      const tag = match[0];
      const type = match[1];
      const fieldName = match[2];

      if (type !== undefined && fieldName !== undefined && !tag.includes('type="file"')) {
        let value = '';
        const valueMatch = tag.match(/value="([^"]*)"/);
        if (valueMatch?.[1] !== undefined) {
          value = valueMatch[1];
        }

        if (type === 'textarea') {
          const textareaMatch = html.match(
            new RegExp(
              `<textarea[^>]*name="person\\[${fieldName}\\]"[^>]*>([\\s\\S]*?)<\\/textarea>`,
            ),
          );
          if (textareaMatch?.[1] !== undefined) {
            value = textareaMatch[1].trim();
          }
        } else if (type === 'select') {
          const selectMatch = html.match(
            new RegExp(`<select[^>]*name="person\\[${fieldName}\\]"[^>]*>([\\s\\S]*?)<\\/select>`),
          );
          if (selectMatch?.[1] !== undefined) {
            const optionMatch = selectMatch[1].match(
              /<option[^>]*selected="selected"[^>]*value="([^"]*)"/,
            );
            if (optionMatch?.[1] === undefined) {
              const optionMatchAlternative = selectMatch[1].match(
                /<option[^>]*value="([^"]*)"[^>]*selected[^>]*>/,
              );
              if (optionMatchAlternative?.[1] !== undefined) {
                value = optionMatchAlternative[1];
              }
            } else {
              value = optionMatch[1];
            }
          }
        }

        fields[fieldName] = value;
      }
      match = inputRegex.exec(html);
    }
    return fields;
  }
}
