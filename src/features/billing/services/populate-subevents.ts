import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';

export async function populateSubeventsUseCase(
  hitobitoService: HitobitoServicePort,
  settingsRepo: SettingsPort,
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  },
): Promise<{ success: boolean; count: number }> {
  const parentGroupId = '4337';
  logger.info(`Fetching subgroups of parent group ${parentGroupId} from Cevi.DB...`);
  const subgroupLinks = await hitobitoService.fetchSubgroupLinks(parentGroupId);
  logger.info(`Found ${subgroupLinks.length} subgroups. Querying events...`);

  const concurrencyLimit = 3;
  const results: Array<{ eventId: string; eventName: string; groupId: string }> = [];

  const executeBatch = async (ids: string[]): Promise<void[]> => {
    return Promise.all(
      ids.map(async (groupId) => {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
          try {
            const events = await hitobitoService.fetchEventsForGroup(groupId);
            for (const event of events) {
              const name = event.name;
              if (name.includes('Hauptlager conveniat27') || name.includes('conveniat27')) {
                results.push({
                  eventId: event.id,
                  eventName: name,
                  groupId: groupId,
                });
              }
            }
            break;
          } catch (error: unknown) {
            attempts++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isTransient =
              errorMessage.includes('503') ||
              errorMessage.includes('429') ||
              errorMessage.toLowerCase().includes('timeout');

            if (attempts >= maxAttempts || !isTransient) {
              logger.warn(`Failed to fetch events for group ${groupId}: ${errorMessage}`);
              break;
            }

            const backoffMs = attempts * 500;
            logger.info(
              `Rate limited/Error 503 for group ${groupId}. Retrying (attempt ${attempts}/${maxAttempts}) in ${backoffMs}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }),
    );
  };

  for (let index = 0; index < subgroupLinks.length; index += concurrencyLimit) {
    const chunk = subgroupLinks.slice(index, index + concurrencyLimit);
    await executeBatch(chunk);
    // Wait 150ms between batches to stay within rate limits
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Fetch existing settings to merge rather than overwriting
  const settings = await settingsRepo.getBillSettings();
  const existingEvents = Array.isArray(settings.events) ? settings.events : [];

  // Merge new results into existingEvents, using eventId as the key
  const mergedEvents = [...existingEvents];
  let newEventsCount = 0;
  for (const newEvent of results) {
    const exists = mergedEvents.some((existingEvent) => existingEvent.eventId === newEvent.eventId);
    if (!exists) {
      mergedEvents.push(newEvent);
      newEventsCount++;
    }
  }

  // Sort merged events by eventName for clean structure in the UI
  mergedEvents.sort((a, b) => a.eventName.localeCompare(b.eventName));

  logger.info(
    `Found ${results.length} matching events (${String(newEventsCount)} new). Updating global settings...`,
  );

  await settingsRepo.updateBillSettingsEvents(mergedEvents);

  return { success: true, count: newEventsCount };
}
