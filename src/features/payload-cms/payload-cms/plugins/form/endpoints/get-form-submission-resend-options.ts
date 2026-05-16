import { hasAccessToThis, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { OutgoingEmail } from '@/features/payload-cms/payload-types';
import type { PayloadHandler } from 'payload';

interface ResendableEmailOption {
  id: string;
  to: string;
  subject: string;
  deliveryStatus: OutgoingEmail['deliveryStatus'];
  createdAt: string;
  smtpReceivedAt?: string | undefined;
  dsnReceivedAt?: string | undefined;
}

export const getFormSubmissionResendOptionsHandler: PayloadHandler = async (request) => {
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

    const outgoingEmails = await request.payload.find({
      collection: 'outgoing-emails',
      where: {
        formSubmission: {
          equals: id,
        },
      },
      sort: 'createdAt',
      limit: 100,
      depth: 0,
      overrideAccess: true,
    });

    const emails: ResendableEmailOption[] = outgoingEmails.docs.map((email) => ({
      id: email.id,
      to: typeof email.to === 'string' && email.to.length > 0 ? email.to : 'unknown',
      subject:
        typeof email.subject === 'string' && email.subject.length > 0
          ? email.subject
          : 'No Subject',
      deliveryStatus: email.deliveryStatus,
      createdAt: email.createdAt,
      smtpReceivedAt: email.smtpReceivedAt ?? undefined,
      dsnReceivedAt: email.dsnReceivedAt ?? undefined,
    }));

    return Response.json({ emails }, { status: 200 });
  } catch (error: unknown) {
    request.payload.logger.error(
      { err: error },
      'Failed to load resend options for form submission',
    );
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
