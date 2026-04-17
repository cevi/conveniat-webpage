import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import prisma from '@/lib/db/prisma';
import type { PayloadHandler } from 'payload';
import { utils, write } from 'xlsx';

interface PDFDocumentWithTables extends Omit<InstanceType<typeof import('pdfkit')>, 'table'> {
  table: (tableData: { title?: string; headers?: string[]; rows?: string[][] }) => void;
}
interface PDFDocumentConstructor {
  new (options?: Record<string, unknown>): PDFDocumentWithTables;
}

export const courseParticipantsExportHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, routeParams } = request;
    const courseId = routeParams?.id as string | undefined;
    if (!courseId) {
      return Response.json({ error: 'Missing course ID' }, { status: 400 });
    }

    const format = new URL(url || '').searchParams.get('format') || 'json';

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: courseId },
      include: {
        user: true, // Includes full Prisma User (name, uuid)
      },
    });

    const userUuids = enrollments.map((e) => e.userId);

    // Fetch Payload users to get extended Hitobito details (nickname, email, groups, hof, quartier, etc.)
    const payloadUsersRes = await request.payload.find({
      collection: 'users',
      where: {
        id: { in: userUuids },
      },
      limit: 1000,
      depth: 0,
    });

    const payloadUsersById = new Map(payloadUsersRes.docs.map((u) => [u.id, u]));

    const participantData = enrollments.map((enrollment) => {
      const payloadUser = payloadUsersById.get(enrollment.userId);
      return {
        uuid: enrollment.userId,
        fullName: payloadUser?.fullName || enrollment.user.name || 'Unbekannt',
        nickname: payloadUser?.nickname || '',
        email: payloadUser?.email || '',
        hof: payloadUser?.hof ? String(payloadUser.hof) : '',
        quartier: payloadUser?.quartier ? String(payloadUser.quartier) : '',
      };
    });

    if (format === 'json') {
      return Response.json({ participants: participantData });
    }

    if (format === 'csv') {
      const header = ['FullName', 'Nickname', 'Email', 'Hof', 'Quartier'].join(';');
      const rows = participantData.map((p) =>
        [
          `"${p.fullName}"`,
          `"${p.nickname}"`,
          `"${p.email}"`,
          `"${p.hof}"`,
          `"${p.quartier}"`,
        ].join(';'),
      );
      const csvContent = [header, ...rows].join('\n');
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="Teilnehmer_${courseId}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      const ws = utils.json_to_sheet(participantData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Teilnehmer');
      const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Teilnehmer_${courseId}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      const PDFDocumentModule = await import('pdfkit-table');
      const PDFDocument = ((PDFDocumentModule as { default?: unknown }).default ||
        PDFDocumentModule) as PDFDocumentConstructor;

      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        try {
          const document_ = new PDFDocument({ margin: 30, size: 'A4' });
          const buffers: Buffer[] = [];

          document_.on('data', buffers.push.bind(buffers));
          document_.on('end', () => resolve(Buffer.concat(buffers)));
          document_.on('error', (error: Error) => reject(error));

          document_.fontSize(20).text(`Teilnehmerliste für ${courseId}`, { align: 'center' });
          document_.moveDown();

          const rows = participantData.map((p) => [
            p.fullName,
            p.nickname,
            p.email,
            p.hof,
            p.quartier,
          ]);

          if (rows.length > 0) {
            document_.table({
              title: 'Teilnehmer',
              headers: ['Name', 'Ceviname', 'Email', 'Hof', 'Quartier'],
              rows: rows,
            });
          } else {
            document_.fontSize(12).text('Keine Teilnehmer angemeldet.');
          }

          document_.end();
        } catch (error) {
          reject(error);
        }
      });

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Teilnehmer_${courseId}.pdf"`,
        },
      });
    }

    return Response.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    request.payload.logger.error({ err: error }, 'Failed to export participants');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
