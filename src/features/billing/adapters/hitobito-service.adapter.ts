/* eslint-disable unicorn/no-null */
import type {
  HitobitoServicePort,
  SyncedExternalParticipant,
} from '@/features/billing/ports/hitobito-service.port';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { EventService } from '@/features/registration_process/hitobito-api/services/event.service';
import { trace } from '@opentelemetry/api';

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

export class HitobitoServiceAdapter implements HitobitoServicePort {
  private readonly client: HitobitoClient;
  private readonly eventService: EventService;
  private readonly participationsJsonCache = new Map<string, LegacyParticipationsResponse>();

  constructor(
    config: { baseUrl: string; apiToken: string; browserCookie: string },
    logger: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string) => void;
    },
  ) {
    this.client = new HitobitoClient(config, logger);
    this.eventService = new EventService(this.client, logger);
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
}
