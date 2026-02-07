import {
  getFrontendHeaders,
  httpGet,
  httpPost,
  type Logger,
} from '@/features/registration_process/hitobito-api/client';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api/config';
import {
  findParticipationIdViaApi,
  removeGroupRole,
} from '@/features/registration_process/hitobito-api/groups';
import {
  extractAuthenticityToken,
  extractFormFields,
} from '@/features/registration_process/hitobito-api/html-parser';
import { getPersonDetails } from '@/features/registration_process/hitobito-api/user-details';
import type { TaskConfig } from 'payload';

export const ensureEventMembershipStep: TaskConfig<{
  input: {
    userId: string;
    firstName?: string;
    lastName?: string;
    answers?: Record<string, string | string[]>;
    internalComment?: string;
  };
  output: {
    success: boolean;
    participationId?: string;
    status?: string;
  };
}> = {
  slug: 'ensureEventMembership',
  retries: 3,
  inputSchema: [
    { name: 'userId', type: 'text', required: true },
    { name: 'firstName', type: 'text', required: false },
    { name: 'lastName', type: 'text', required: false },
    { name: 'answers', type: 'json', required: false },
    { name: 'internalComment', type: 'text', required: false },
  ],
  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'participationId', type: 'text' },
    { name: 'status', type: 'text' },
  ],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;
    const { userId, firstName, lastName, answers, internalComment } = input;
    const { helperGroupId: groupId, eventId, baseUrl } = HITOBITO_CONFIG;

    if (groupId === undefined || groupId === '') {
      const error = new Error('Configuration Error: HELPER_GROUP is missing');
      logger.error(String(error));
      throw error;
    }

    if (eventId === undefined || eventId === '') {
      const error = new Error('Configuration Error: EVENT_ID is missing');
      logger.error(String(error));
      throw error;
    }

    logger.info(`Ensuring event membership for user ${userId} in event ${eventId}...`);

    try {
      // 0. Fetch authoritative names from DB to ensure scraping works if not provided
      let scrapeFirstName = firstName;
      let scrapeLastName = lastName;

      if (scrapeFirstName === undefined || scrapeLastName === undefined) {
        const detailsResult = await getPersonDetails(userId, logger);
        if (detailsResult.success && detailsResult.attributes) {
          scrapeFirstName = detailsResult.attributes.first_name ?? scrapeFirstName;
          scrapeLastName = detailsResult.attributes.last_name ?? scrapeLastName;
          logger.info(
            `Using authoritative name for scraping: ${scrapeFirstName} ${scrapeLastName}`,
          );
        } else {
          logger.warn(
            `Could not fetch person details, falling back to input name: ${scrapeFirstName} ${scrapeLastName}`,
          );
        }
      }

      const safeFirstName = scrapeFirstName ?? '';
      const safeLastName = scrapeLastName ?? '';

      // 1. Check / Find Participation (Idempotency)
      // Attempt 1: API (Preferred)
      let participationId = await findParticipationIdViaApi(userId, eventId, logger);

      // Attempt 2: Internal JSON (Idempotency Fallback)
      // If API fails to find it, check the internal JSON endpoint which is more reliable in this env
      if (participationId === undefined) {
        logger.info(`Participation not found via API, checking internal JSON for idempotency...`);
        participationId = await findParticipationIdFrontend(
          userId,
          safeFirstName,
          safeLastName,
          groupId,
          eventId,
          baseUrl,
          logger,
        );
      }

      let status: 'exists' | 'created' | 'updated' | 'failed' = 'exists';

      // 2. Add if missing
      if (participationId === undefined) {
        const personLabel = `${safeFirstName} ${safeLastName}`;
        logger.info(`Participation not found, adding user ${personLabel} to event...`);

        participationId = await addUserToEventFrontend(
          userId,
          personLabel,
          groupId,
          eventId,
          baseUrl,
          logger,
          safeFirstName,
          safeLastName,
        );
        status = 'created';

        // 2b. Verify addition via API (Crucial for reliability)
        if (participationId === undefined) {
          // Final attempt: check API one more time if addition seemed to fail to extract ID
          logger.info(`No ID extracted from addition result, checking API as last-ditch effort...`);
          // Try a few times with increasing delay for eventual consistency
          for (let index = 0; index < 3; index++) {
            await new Promise((resolve) => setTimeout(resolve, 1500 * (index + 1)));
            participationId = await findParticipationIdViaApi(userId, eventId, logger);
            if (participationId !== undefined) break;
          }

          // If API still fails, try internal JSON as the very last resort
          if (participationId === undefined) {
            participationId = await findParticipationIdFrontend(
              userId,
              safeFirstName,
              safeLastName,
              groupId,
              eventId,
              baseUrl,
              logger,
            );
          }
        } else {
          // Wait a bit for backend consistency
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const verifiedId = await findParticipationIdViaApi(userId, eventId, logger);
          if (verifiedId === undefined) {
            logger.warn(
              `Could not verify membership in event ${eventId} for user ${userId} via API after addition. Scrape ID was ${participationId}.`,
            );
          } else {
            logger.info(
              `Successfully verified membership in event ${eventId} for user ${userId} via API.`,
            );
            participationId = verifiedId;
          }
        }
      }

      if (participationId === undefined) {
        throw new Error('Failed to create participation');
      }

      // Cleanup support group once we have confirmed participation (either existing or created)
      try {
        await removeGroupRole(userId, HITOBITO_CONFIG.supportGroupId, logger);
      } catch (error) {
        logger.warn(`Failed to cleanup support group for user ${userId}: ${String(error)}`);
      }

      // 3. Update Details (if needed)
      if (answers !== undefined || internalComment !== undefined) {
        logger.info(`Updating participation details for ${participationId}...`);
        const timestamp = new Date().toISOString();
        const comment =
          internalComment !== undefined && internalComment !== ''
            ? `${internalComment} (Updated via Workflow at ${timestamp})`
            : `Updated via Workflow at ${timestamp}`;

        await updateParticipationDetails(
          participationId,
          eventId,
          baseUrl,
          logger,
          answers,
          comment,
        );
        status = status === 'created' ? 'created' : 'updated';
      }

      return {
        output: {
          success: true,
          participationId,
          status,
        },
      };
    } catch (error) {
      logger.error(`Failed to ensure event membership: ${String(error)}`);
      throw error;
    }
  },
};

/**
 * Find a participation ID using Hitobito's internal JSON endpoints.
 * This is faster and more precise than HTML scraping.
 */
async function findParticipationIdFrontend(
  personId: string,
  firstName: string,
  lastName: string,
  groupId: string,
  eventId: string,
  baseUrl: string,
  logger: Logger,
): Promise<string | undefined> {
  const cookie = HITOBITO_CONFIG.browserCookie;

  try {
    // 1. Fetch participant list in JSON format (appending .json)
    const query = encodeURIComponent(`${firstName} ${lastName}`);
    const listUrl = `${baseUrl}/groups/${groupId}/events/${eventId}/participations.json?returning=true&page=1&q=${query}`;
    const { response, body } = await httpGet(listUrl, { cookies: cookie });

    if (!response.ok) {
      logger.warn(`Failed to fetch internal JSON participation list: ${response.status}`);
      return undefined;
    }

    const data = JSON.parse(body) as {
      event_participations?: Array<{
        id: string;
        links: {
          person: string;
        };
      }>;
    };

    if (data.event_participations && Array.isArray(data.event_participations)) {
      // 2. Match the person ID exactly within the JSON structure
      const match = data.event_participations.find((p) => String(p.links.person) === personId);
      if (match) {
        logger.info(
          `[Workflow] Found matching participation ${match.id} for person ${personId} via internal JSON.`,
        );
        return match.id;
      }
    }

    return undefined;
  } catch (error) {
    logger.warn(`Error in findParticipationIdFrontend: ${String(error)}`);
    return undefined;
  }
}

// Internal Helper: Add User to Event (Scraping)
async function addUserToEventFrontend(
  personId: string,
  personLabel: string,
  groupId: string,
  eventId: string,
  baseUrl: string,
  logger: Logger,
  firstName?: string,
  lastName?: string,
): Promise<string | undefined> {
  const cookie = HITOBITO_CONFIG.browserCookie;
  const formUrl = `${baseUrl}/groups/${groupId}/events/${eventId}/roles/new`;
  const formUrlWithParameters = `${formUrl}?event_role%5Btype%5D=Event%3A%3ARole%3A%3AParticipant`;

  const { response: formResponse, body: formHtml } = (await httpGet(formUrlWithParameters, {
    cookies: cookie,
  })) as { response: Response; body: string };
  if (!formResponse.ok) return undefined;

  const token = extractAuthenticityToken(formHtml);

  const postUrl = `${baseUrl}/groups/${groupId}/events/${eventId}/roles`;

  const formData = new URLSearchParams();
  formData.append('authenticity_token', token);
  formData.append('event_role[type]', 'Event::Role::Participant');
  formData.append('event_role[person_id]', personId);
  formData.append('event_role[person]', personLabel);
  formData.append('event_role[label]', '');
  formData.append('button', '');

  const { response: postResponse, body: postBody } = (await httpPost(postUrl, {
    headers: getFrontendHeaders(formUrl),
    cookies: cookie,
    body: formData.toString(),
  })) as { response: Response; body: string };

  const finalUrl = postResponse.url;

  if (postResponse.status >= 400) {
    const errorMessage = `Failed to add user to event: ${postResponse.status} ${postResponse.statusText}. Body: ${postBody}`;
    logger.warn(`[Workflow] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  logger.info(`[Workflow] Final URL: ${finalUrl}`);

  if (finalUrl.includes('/participations/')) {
    const parts = finalUrl.split('/');
    const index = parts.indexOf('participations');

    if (index === -1) {
      logger.warn(`[Workflow] Could not find "participations" in final URL: ${finalUrl}`);
      return undefined;
    }
    if (parts.length <= index + 1) {
      logger.warn(`[Workflow] No ID part found after "participations" in URL: ${finalUrl}`);
      return undefined;
    }

    const idPart = parts[index + 1];
    const id = idPart === undefined ? undefined : idPart.split('?')[0];
    if (id !== undefined && /^\d+$/.test(id)) {
      return id;
    }
    logger.warn(
      `[Workflow] Extracted ID part ${String(idPart)} is not numeric in URL: ${finalUrl}`,
    );
  }

  // Strategy 2: Scrape from response body (Fallback for missed redirects or Turbo results)
  const links = [...postBody.matchAll(/\/participations\/(\d+)/g)];
  if (links.length > 0) {
    for (const link of links) {
      const id = link[1];
      const linkIndex = link.index;
      // Check if this ID is near the person's name or a success indicator in the HTML
      const contextStart = Math.max(0, linkIndex - 200);
      const contextEnd = Math.min(postBody.length, linkIndex + 400);
      const context = postBody.slice(contextStart, contextEnd);

      const hasName =
        context.toLowerCase().includes(personId.toLowerCase()) ||
        context.toLowerCase().includes(personLabel.toLowerCase()) ||
        (lastName !== undefined && context.toLowerCase().includes(lastName.toLowerCase())) ||
        (firstName !== undefined && context.toLowerCase().includes(firstName.toLowerCase()));

      const isSuccess = postBody.includes('erfolgreich erstellt') || postBody.includes('Rolle');

      if (hasName) {
        logger.info(
          `[Workflow] Extracted participation ID ${id} from response body context (fallback). Success indicator: ${isSuccess}`,
        );
        return id;
      }
    }
  }

  if (finalUrl !== '') {
    logger.info(
      `[Workflow] Final URL does not contain "/participations/": ${finalUrl}. Status: ${postResponse.status}`,
    );
  }

  // If we're on a page with errors, that's why it failed
  if (postBody.includes('alert-danger') || postBody.includes('has-error')) {
    logger.warn(`[Workflow] Possible validation errors found in response body.`);
  }

  return undefined;
}

// Internal Helper: Update Participation (Scraping)
async function updateParticipationDetails(
  participationId: string,
  eventId: string,
  baseUrl: string,
  _logger: Logger,
  answersMap?: Record<string, string | string[]>,
  internalComment?: string,
): Promise<void> {
  const cookie = HITOBITO_CONFIG.browserCookie;
  const editUrl = `${baseUrl}/events/${eventId}/participations/${participationId}/edit`;

  const { response: editResponse, body: editHtml } = (await httpGet(editUrl, {
    cookies: cookie,
  })) as { response: Response; body: string };
  if (!editResponse.ok) throw new Error('Failed to fetch edit form');

  const token = extractAuthenticityToken(editHtml);
  const fields = extractFormFields(editHtml);

  const updateUrl = `${baseUrl}/events/${eventId}/participations/${participationId}`;
  const formData = new URLSearchParams();
  formData.append('_method', 'patch');
  formData.append('authenticity_token', token);

  // Add required hidden fields
  for (const [key, value] of Object.entries(fields)) {
    if (!formData.has(key)) formData.append(key, value);
  }

  // Update answers
  if (answersMap) {
    for (const [qId, answer] of Object.entries(answersMap)) {
      if (Array.isArray(answer)) {
        for (const val of answer) {
          formData.append(`participation[answer_${qId}][]`, String(val));
        }
      } else {
        formData.append(`participation[answer_${qId}]`, String(answer));
      }
    }
  }

  if (internalComment !== undefined) {
    formData.append('participation[internal_comment]', internalComment);
  }

  const { response: patchResponse } = (await httpPost(updateUrl, {
    headers: getFrontendHeaders(editUrl),
    cookies: cookie,
    body: formData.toString(),
  })) as { response: Response; body: string };

  if (!patchResponse.ok && patchResponse.status !== 302 && patchResponse.status !== 303) {
    throw new Error(`Failed to update participation: ${patchResponse.status}`);
  }
}
