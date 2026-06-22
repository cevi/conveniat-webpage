/* eslint-disable unicorn/no-null */
import type {
  HitobitoServicePort,
  SyncedExternalParticipant,
} from '@/features/billing/ports/hitobito-service.port';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { EventService } from '@/features/registration_process/hitobito-api/services/event.service';

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

export class HitobitoServiceAdapter implements HitobitoServicePort {
  private readonly client: HitobitoClient;
  private readonly eventService: EventService;

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
  ): Promise<Record<string, string>> {
    return this.eventService.fetchParticipationAnswers(eventId, participationId);
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
