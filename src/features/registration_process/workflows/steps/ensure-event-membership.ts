import {
  getFrontendHeaders,
  httpGet,
  httpPost,
  type Logger,
} from '@/features/registration_process/hitobito-api/client';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api/config';
import {
  extractAuthenticityToken,
  extractFormFields,
  extractParticipationIdFromUrl,
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
      let participationId = await getParticipationIdFrontend(
        userId,
        safeFirstName,
        safeLastName,
        groupId,
        eventId,
        baseUrl,
        logger,
      );

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
        );
        status = 'created';
      }

      if (participationId === undefined) {
        throw new Error('Failed to create participation');
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

// Internal Helper: Get Participation ID (Scraping with search optimization)
async function getParticipationIdFrontend(
  personId: string,
  firstName: string,
  lastName: string,
  groupId: string,
  eventId: string,
  baseUrl: string,
  logger: Logger,
): Promise<string | undefined> {
  // Optimization: use the 'search' parameter to filter by personId.
  const url = `${baseUrl}/groups/${groupId}/events/${eventId}/participations?search=${personId}`;
  const cookie = HITOBITO_CONFIG.browserCookie;

  logger.info(
    `[Workflow] Scraping participations from ${url} for ${firstName} ${lastName} (personId: ${personId})`,
  );

  const { response, body } = (await httpGet(url, { cookies: cookie })) as {
    response: Response;
    body: string;
  };

  if (!response.ok) {
    if (response.status >= 500)
      throw new Error(`Server error fetching participations: ${response.status}`);
    return undefined;
  }

  // Simple scraping using regex instead of generic parser to find row with name and link
  // We need to find a table row or list item that contains the name AND a link to participation
  // Strategy: split by <tr> or <li>, then regex match
  const items = body.split(/<\/?(tr|li)[^>]*>/);
  const fnameLower = firstName.toLowerCase();
  const lnameLower = lastName.toLowerCase();

  for (const item of items) {
    const itemLower = item.toLowerCase();
    if (itemLower.includes(fnameLower) && itemLower.includes(lnameLower)) {
      // Found potential match, look for link
      const linkMatch = item.match(/href="([^"]*\/participations\/[^"]*)"/);
      const urlMatch = linkMatch?.[1];
      if (urlMatch !== undefined) {
        const id = extractParticipationIdFromUrl(urlMatch);
        if (id) {
          logger.info(
            `[Workflow] Found existing participation ID ${id} for ${firstName} ${lastName} via scraping`,
          );
          return id;
        }
      }
    }
  }

  logger.info(`[Workflow] Participation ID not found in list for ${firstName} ${lastName}`);
  return undefined;
}

// Internal Helper: Add User to Event (Scraping)
async function addUserToEventFrontend(
  personId: string,
  personLabel: string,
  groupId: string,
  eventId: string,
  baseUrl: string,
  logger: Logger,
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

  if (finalUrl.includes('/participations/')) {
    const parts = finalUrl.split('/');
    const index = parts.indexOf('participations');

    if (index === -1) return undefined;
    if (parts.length <= index + 1) return undefined;

    const idPart = parts[index + 1];
    const id = idPart === undefined ? undefined : idPart.split('?')[0];
    if (id !== undefined && /^\d+$/.test(id)) {
      return id;
    }
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
