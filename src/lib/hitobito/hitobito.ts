import { HitobitoClient } from '@/lib/hitobito/client';
import { EventService } from '@/lib/hitobito/services/event.service';
import { GroupService } from '@/lib/hitobito/services/group.service';
import { MatcherService } from '@/lib/hitobito/services/matcher.service';
import { PersonService } from '@/lib/hitobito/services/person.service';
import { RegistrationService } from '@/lib/hitobito/services/registration.service';
import type { HitobitoConfig, Logger } from '@/lib/hitobito/types';

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
