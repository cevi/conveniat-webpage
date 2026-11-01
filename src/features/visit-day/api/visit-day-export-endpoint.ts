import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { getHofDirectory } from '@/features/payload-cms/payload-cms/utils/hof-directory';
import type { ExportSubmission } from '@/features/visit-day/api/visit-day-export';
import { buildVisitorWorkbook } from '@/features/visit-day/api/visit-day-export';
import prisma from '@/lib/db/prisma';
import type { PayloadHandler } from 'payload';

/**
 * GET /api/globals/visit-day/export-xlsx – every Besuchstag visitor, one row each.
 *
 * Full admins only, like the global it sits on: the rows carry names, email addresses and
 * allergies.
 */
export const visitDayExportHandler: PayloadHandler = async (request) => {
  if (!isFullAdmin({ req: request })) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const registrations = await prisma.visitDayRegistration.findMany({
      orderBy: [{ visitDate: 'asc' }, { number: 'asc' }],
      include: { visitors: { orderBy: { personNumber: 'asc' } } },
    });
    const visitors = registrations.flatMap((registration) =>
      registration.visitors.map((visitor) => ({
        id: visitor.id,
        registrationNumber: registration.number,
        submissionId: registration.submissionId,
        personNumber: visitor.personNumber,
        hofId: registration.hofId,
        date: registration.visitDate.toISOString().slice(0, 10),
      })),
    );
    const submissionIds = [...new Set(visitors.map((visitor) => visitor.submissionId))];
    const [{ docs }, directory] = await Promise.all([
      request.payload.find({
        collection: 'form-submissions',
        where: { id: { in: submissionIds } },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { createdAt: true, submissionData: true },
      }),
      getHofDirectory(request.payload),
    ]);
    const submissions = new Map<string, ExportSubmission>(
      docs.map((submission) => [
        submission.id,
        { createdAt: submission.createdAt, answers: submission.submissionData ?? [] },
      ]),
    );
    const hofNames = new Map([...directory].map(([id, hof]) => [id, hof.name]));

    const workbook = await buildVisitorWorkbook(visitors, submissions, hofNames);
    request.payload.logger.info(`Besuchstag visitor list exported with ${visitors.length} rows.`);

    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="besuchstag-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        // names and allergies: the browser must not keep a copy on disk
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    request.payload.logger.error({ err: error }, 'Besuchstag visitor export failed.');
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
};
