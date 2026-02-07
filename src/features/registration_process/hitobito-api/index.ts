import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { EventService } from '@/features/registration_process/hitobito-api/services/event.service';
import { GroupService } from '@/features/registration_process/hitobito-api/services/group.service';
import { MatcherService } from '@/features/registration_process/hitobito-api/services/matcher.service';
import { PersonService } from '@/features/registration_process/hitobito-api/services/person.service';
import { RegistrationService } from '@/features/registration_process/hitobito-api/services/registration.service';
import type { HitobitoConfig, Logger } from '@/features/registration_process/hitobito-api/types';

export class Hitobito {
  public readonly people: PersonService;
  public readonly groups: GroupService;
  public readonly events: EventService;
  public readonly matcher: MatcherService;
  public readonly registrations: RegistrationService;
  public readonly client: HitobitoClient;

  constructor(config: HitobitoConfig, logger?: Logger) {
    this.client = new HitobitoClient(config, logger);
    this.people = new PersonService(this.client, logger);
    this.groups = new GroupService(this.client, logger);
    this.events = new EventService(this.client, logger);
    this.matcher = new MatcherService(this, logger);
    this.registrations = new RegistrationService(this, logger);
  }

  /**
   * Static factory method to create an instance from environment variables or config
   */
  static create(config: HitobitoConfig, logger?: Logger): Hitobito {
    return new Hitobito(config, logger);
  }
}

export { FatalError } from '@/features/registration_process/hitobito-api/client';
export {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
} from '@/features/registration_process/hitobito-api/config';
export * from '@/features/registration_process/hitobito-api/schemas';
export type {
  HitobitoConfig,
  Logger,
  PersonAttributes,
  PersonResource,
  SearchCandidate,
} from '@/features/registration_process/hitobito-api/types';
