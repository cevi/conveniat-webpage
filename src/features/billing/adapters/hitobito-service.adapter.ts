/* eslint-disable unicorn/no-null */
import type {
  HitobitoPersonDetails,
  HitobitoServicePort,
  ParticipationAnswerUpdate,
  SyncedExternalParticipant,
} from '@/features/billing/ports/hitobito-service.port';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import {
  type ParticipationAnswerField,
  parseParticipationAnswerFields,
} from '@/features/registration_process/hitobito-api/html-parser';
import { EventService } from '@/features/registration_process/hitobito-api/services/event.service';
import { PersonService } from '@/features/registration_process/hitobito-api/services/person.service';
import { trace } from '@opentelemetry/api';
import { z } from 'zod';

interface GroupResource {
  id: string;
}

interface GroupApiResponse {
  data?: GroupResource[];
  links?: {
    next?: string | null;
  };
}

interface EventResource {
  id: string;
  attributes?: {
    name?: string;
  };
}

interface EventApiResponse {
  data?: EventResource[];
}

interface LegacyParticipationsResponse {
  event_participations?: Array<{
    id: string | number;
    links?: {
      event_answers?: Array<string | number>;
    };
  }>;
  linked?: {
    event_answers?: Array<{
      id: string | number;
      question?: string | null;
      answer?: string | null;
    } | null>;
  };
}

/**
 * The role class Cevi.DB gives the people who maintain a Hof's addresses. They are the
 * recipients of a Pflichtangaben reminder for that Hof.
 */
const ADDRESS_MANAGER_ROLE_CLASS = 'Group::MitgliederorganisationExterne::Adressverwalter';

/**
 * The legacy `people.json` payload, read defensively: it is a frontend endpoint, so a
 * person without an e-mail, without roles or with an unexpected extra key is normal and
 * must not lose us the rest of the list.
 */
const PeopleJsonSchema = z.object({
  people: z
    .array(
      z
        .object({
          email: z.string().nullish(),
          links: z
            .object({ roles: z.array(z.union([z.string(), z.number()])).nullish() })
            .nullish(),
        })
        .passthrough(),
    )
    .nullish(),
  linked: z
    .object({
      roles: z
        .array(
          z
            .object({
              id: z.union([z.string(), z.number()]),
              role_class: z.string().nullish(),
            })
            .passthrough()
            .nullable(),
        )
        .nullish(),
    })
    .nullish(),
});

/** The answer control whose question text contains every keyword, case-insensitively. */
function findAnswerField(
  html: string,
  questionKeywords: string[],
): ParticipationAnswerField | undefined {
  return parseParticipationAnswerFields(html).find((field) =>
    questionKeywords.every((keyword) => field.label.toLowerCase().includes(keyword.toLowerCase())),
  );
}

export class HitobitoServiceAdapter implements HitobitoServicePort {
  private readonly client: HitobitoClient;
  private readonly eventService: EventService;
  private readonly personService: PersonService;
  private readonly participationsJsonCache = new Map<string, LegacyParticipationsResponse>();

  constructor(
    configOrClient: { baseUrl: string; apiToken: string; browserCookie: string } | HitobitoClient,
    logger: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string) => void;
    },
  ) {
    this.client =
      'apiRequest' in configOrClient ? configOrClient : new HitobitoClient(configOrClient, logger);
    this.eventService = new EventService(this.client, logger);
    this.personService = new PersonService(this.client, logger);
  }

  async fetchParticipations(
    groupId: string,
    eventId: string,
  ): Promise<SyncedExternalParticipant[]> {
    const participations = await this.eventService.listEventParticipations(groupId, eventId);
    return participations.map((p) => ({
      participationId: p.participationId,
      participantId: p.participantId,
      eventId: p.eventId,
      firstName: p.firstName,
      lastName: p.lastName,
      nickname: p.nickname,
      fullName: p.fullName,
      roleType: p.roleType,
      enrollmentDate: p.enrollmentDate,
      street: p.street ?? null,
      housenumber: p.housenumber ?? null,
      zip: p.zip ?? null,
      zipCode: p.zipCode ?? null,
      town: p.town ?? null,
      country: p.country ?? null,
      birthday: p.birthday ?? null,
      gender: p.gender ?? null,
      active: p.active,
    }));
  }

  async fetchParticipationAnswers(
    eventId: string,
    participationId: string,
    groupId?: string,
  ): Promise<Record<string, string>> {
    const activeSpan = trace.getActiveSpan();
    const attempts: string[] = [];
    const recordAttempt = (message: string): void => {
      attempts.push(message);
      if (activeSpan) {
        activeSpan.setAttribute('fetch_answers.fallback_path', attempts.join(' -> '));
      }
    };

    // 1. First try to fetch using new JSON API
    recordAttempt(`Try JSON:API (/api/event_participations/${participationId})`);
    try {
      const path = `/api/event_participations/${participationId}`;
      const response = await this.client.apiRequest<{
        data?: {
          attributes?: {
            answers?: Record<string, unknown>;
            [key: string]: unknown;
          };
        };
      }>('GET', path);

      const attributes = response.data?.attributes;
      if (attributes !== undefined) {
        const answers: Record<string, string> = {};

        const answersObject = attributes.answers;
        if (answersObject !== undefined) {
          for (const [k, v] of Object.entries(answersObject)) {
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
              answers[k] = String(v);
            }
          }
        }

        for (const [k, v] of Object.entries(attributes)) {
          if (
            (k.startsWith('answer_') || k.startsWith('answer-')) &&
            (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
          ) {
            answers[k] = String(v);
          }
        }

        if (Object.keys(answers).length > 0) {
          recordAttempt(`Success JSON:API (${Object.keys(answers).length} answers)`);
          return answers;
        }
      }
      recordAttempt('Fail JSON:API (no answers found in response attributes)');
    } catch (error) {
      recordAttempt(`Fail JSON:API (${error instanceof Error ? error.message : String(error)})`);
    }

    // 2. Then try to fetch using .json at the end of the URL (legacy endpoint)
    if (groupId !== undefined && groupId !== '') {
      recordAttempt(`Try Legacy API (/groups/${groupId}/events/${eventId}/participations.json)`);
      try {
        const cacheKey = `${groupId}:${eventId}`;
        let parsed = this.participationsJsonCache.get(cacheKey);

        if (parsed === undefined) {
          const path = `/groups/${groupId}/events/${eventId}/participations.json`;
          const { response, body } = await this.client.frontendRequest('GET', path, {
            headers: {
              ...this.client.getFrontendHeaders(),
              'X-Token': this.client.config.apiToken,
            },
          });

          if (response.ok) {
            parsed = JSON.parse(body) as LegacyParticipationsResponse;
            this.participationsJsonCache.set(cacheKey, parsed);
          } else {
            recordAttempt(`Fail Legacy API request (status ${response.status})`);
          }
        }

        if (parsed !== undefined) {
          const epList = parsed.event_participations;
          const linkedAnswers = parsed.linked?.event_answers;
          if (Array.isArray(epList) && Array.isArray(linkedAnswers)) {
            const p = epList.find((ep) => String(ep.id) === participationId);
            if (p !== undefined) {
              const answers: Record<string, string> = {};
              const answerIds = new Set(p.links?.event_answers?.map(String) ?? []);
              if (answerIds.size > 0) {
                for (const ans of linkedAnswers) {
                  if (ans && answerIds.has(String(ans.id))) {
                    const q = ans.question ?? '';
                    const a = ans.answer ?? '';
                    if (q !== '') {
                      answers[q] = a;
                    }
                  }
                }
              }
              recordAttempt(`Success Legacy API (${Object.keys(answers).length} answers)`);
              return answers;
            }
          }
          recordAttempt('Fail Legacy API (participation or linked answers not found in JSON)');
        }
      } catch (error) {
        recordAttempt(
          `Fail Legacy API (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    } else {
      recordAttempt('Skip Legacy API (groupId is undefined)');
    }

    // 3. As a final resort, try to fetch using frontend hack (edit page scraping)
    recordAttempt(
      `Try HTML Scraper (event: ${eventId}, part: ${participationId}, group: ${groupId ?? 'none'})`,
    );
    const finalAnswers = await this.eventService.fetchParticipationAnswers(
      eventId,
      participationId,
      groupId,
      recordAttempt,
    );
    recordAttempt(`Scraper complete (found ${Object.keys(finalAnswers).length} answers)`);
    return finalAnswers;
  }

  async fetchSubgroupLinks(parentGroupId: string): Promise<string[]> {
    const subgroupLinks: string[] = [];
    let nextUrl: string | undefined = `/api/groups`;
    let isFirstPage = true;
    const baseParameters: Record<string, string> = {
      'filter[parent_id][eq]': parentGroupId,
      'page[size]': '100',
    };

    while (typeof nextUrl === 'string' && nextUrl !== '') {
      const response: GroupApiResponse = await this.client.apiRequest<GroupApiResponse>(
        'GET',
        nextUrl,
        isFirstPage ? { params: baseParameters } : {},
      );
      if (response.data !== undefined) {
        for (const group of response.data) {
          if (typeof group.id === 'string' && group.id !== '') {
            subgroupLinks.push(group.id);
          }
        }
      }
      nextUrl = response.links?.next ?? undefined;
      isFirstPage = false;
    }
    return subgroupLinks;
  }

  async fetchEventsForGroup(groupId: string): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.apiRequest<EventApiResponse>('GET', '/api/events', {
      params: {
        'filter[group_id][eq]': groupId,
      },
    });
    if (!response.data) return [];
    return response.data.map((event) => ({
      id: event.id,
      name: event.attributes?.name ?? '',
    }));
  }

  async fetchAddressManagerEmails(groupId: string): Promise<string[]> {
    const path = `/groups/${groupId}/people.json`;
    const { response, body } = await this.client.frontendRequest('GET', path, {
      headers: {
        ...this.client.getFrontendHeaders(),
        'X-Token': this.client.config.apiToken,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch address managers for group ${groupId}: status ${String(response.status)}`,
      );
    }

    const parsed = PeopleJsonSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return [];

    const addressManagerRoleIds = new Set(
      (parsed.data.linked?.roles ?? [])
        .filter((role) => role !== null && role.role_class === ADDRESS_MANAGER_ROLE_CLASS)
        .map((role) => String(role?.id)),
    );

    const emails = new Set<string>();
    for (const person of parsed.data.people ?? []) {
      const hasRole = (person.links?.roles ?? []).some((roleId) =>
        addressManagerRoleIds.has(String(roleId)),
      );
      if (!hasRole) continue;
      const email = (person.email ?? '').trim().toLowerCase();
      if (email !== '') emails.add(email);
    }

    return [...emails];
  }

  /**
   * Writes one answer of a participation back to the Cevi.DB. See the port for the
   * contract; the mechanics below are Hitobito's.
   */
  async updateParticipationAnswer(
    groupId: string,
    eventId: string,
    participationId: string,
    questionKeywords: string[],
    value: string,
    keepValues: string[] = [],
  ): Promise<ParticipationAnswerUpdate> {
    const editPath = `/groups/${groupId}/events/${eventId}/participations/${participationId}/edit`;

    // Always read the form fresh, never a cached answers map: the PATCH re-sends every
    // other answer, so it must carry what the Cevi.DB holds at this moment.
    const before = findAnswerField(await this.fetchEditForm(editPath), questionKeywords);
    if (before === undefined) {
      throw new Error(
        `Keine Frage mit «${questionKeywords.join(' ')}» auf dem Anmeldeformular ${editPath} gefunden.`,
      );
    }

    const previous = (before.value ?? '').trim();
    const isKept = keepValues.some((kept) => kept.toLowerCase() === previous.toLowerCase());
    if (previous === value.trim() || isKept) {
      return { changed: false, previous };
    }

    const { response } = await this.client.submitRailsForm({
      getFormUrl: editPath,
      postUrl: `/groups/${groupId}/events/${eventId}/participations/${participationId}`,
      method: 'PATCH',
      // Every other answer is re-sent unchanged; only this one field is overridden.
      extractExtraFields: true,
      formData: { [before.fieldName]: value, button: '' },
      extraHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'text/vnd.turbo-stream.html, text/html, application/xhtml+xml',
        Origin: this.client.config.baseUrl,
      },
    });

    // Turbo answers a successful update with a redirect, so a 3xx is not a failure.
    if (response.status < 200 || response.status >= 400) {
      throw new Error(
        `Anmeldestatus-Rückschreibung für Teilnahme ${participationId} fehlgeschlagen: Status ${String(response.status)}.`,
      );
    }

    const after = findAnswerField(await this.fetchEditForm(editPath), questionKeywords);
    const confirmed = (after?.value ?? '').trim();
    if (confirmed !== value.trim()) {
      throw new Error(
        `Rückschreibung für Teilnahme ${participationId} nicht bestätigt: vorher «${previous}», erwartet «${value}», Formular zeigt «${confirmed}».`,
      );
    }

    return { changed: true, previous };
  }

  /** Fetches the participation edit page, failing loudly rather than parsing an error page. */
  private async fetchEditForm(editPath: string): Promise<string> {
    const { response, body } = await this.client.frontendRequest('GET', editPath);
    if (!response.ok) {
      throw new Error(
        `Anmeldeformular ${editPath} konnte nicht geladen werden: Status ${String(response.status)}.`,
      );
    }
    return body;
  }

  async fetchPersonDetails(personId: string): Promise<HitobitoPersonDetails | null> {
    const result = await this.personService.getDetails({ personId });
    if (!result.success || !result.attributes) {
      return null;
    }
    return {
      firstName: result.attributes.first_name ?? undefined,
      lastName: result.attributes.last_name ?? undefined,
      street: result.attributes.street ?? undefined,
      houseNumber: result.attributes.house_number ?? result.attributes.housenumber ?? undefined,
      zip: result.attributes.zip ?? result.attributes.zip_code ?? undefined,
      town: result.attributes.town ?? undefined,
      birthday: result.attributes.birthday ?? undefined,
    };
  }
}
