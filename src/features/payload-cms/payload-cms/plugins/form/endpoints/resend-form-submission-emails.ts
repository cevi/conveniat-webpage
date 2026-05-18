import { hasAccessToThis, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import type { OutgoingEmail } from '@/features/payload-cms/payload-types';
import type { PayloadHandler } from 'payload';

interface ResendRequestBody {
  outgoingEmailIds?: unknown;
}

export const resendFormSubmissionEmailsHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = hasAccessToThis({
      req: request,
      requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
    });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = request.routeParams ?? {};
    if (typeof id !== 'string' || id.length === 0) {
      return Response.json({ error: 'Missing submission ID' }, { status: 400 });
    }

    const body = request.json
      ? ((await request.json().catch(() => {})) as ResendRequestBody | undefined)
      : undefined;
    const requestedIds = Array.isArray(body?.outgoingEmailIds)
      ? body.outgoingEmailIds.filter(
          (value): value is string => typeof value === 'string' && value.length > 0,
        )
      : [];

    if (requestedIds.length === 0) {
      return Response.json({ error: 'No emails selected' }, { status: 400 });
    }

    const outgoingEmails = await request.payload.find({
      collection: 'outgoing-emails',
      where: {
        and: [
          {
            id: {
              in: requestedIds,
            },
          },
          {
            formSubmission: {
              equals: id,
            },
          },
        ],
      },
      limit: requestedIds.length,
      depth: 0,
      overrideAccess: true,
    });

    const emailsById = new Map<string, OutgoingEmail>(
      outgoingEmails.docs.map((email) => [email.id, email]),
    );

    let resentCount = 0;
    for (const emailId of requestedIds) {
      const outgoingEmail = emailsById.get(emailId);
      if (outgoingEmail === undefined) {
        continue;
      }

      await sendTrackedEmail(
        request.payload,
        {
          to: outgoingEmail.to,
          subject: outgoingEmail.subject,
          ...(typeof outgoingEmail.html === 'string' && outgoingEmail.html.length > 0
            ? { html: outgoingEmail.html }
            : {}),
        },
        id,
      );
      resentCount++;
    }

    return Response.json(
      {
        count: resentCount,
        message: `Resent ${resentCount} email${resentCount === 1 ? '' : 's'}`,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    request.payload.logger.error({ err: error }, 'Failed to resend form submission emails');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
