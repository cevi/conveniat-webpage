/* eslint-disable @typescript-eslint/prefer-promise-reject-errors, unicorn/no-null, unicorn/prefer-logical-operator-over-ternary, @typescript-eslint/strict-boolean-expressions */
import { RESSORT_OPTIONS } from '@/features/payload-cms/constants/ressort-options';
import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { FormSubmission, HelperJob } from '@/features/payload-cms/payload-types';
import type { PayloadHandler } from 'payload';
interface PDFDocumentWithTables extends Omit<InstanceType<typeof import('pdfkit')>, 'table'> {
  table: (tableData: { title?: string; headers?: string[]; rows?: string[][] }) => void;
}

interface PDFDocumentConstructor {
  new (options?: Record<string, unknown>): PDFDocumentWithTables;
}
// pdfkit-table removed from top level to prevent module evaluation crashes

export const helperJobsPdfReportHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url || '');
    const formId = url.searchParams.get('formId');
    const fieldsParameter = url.searchParams.get('fields') || '';
    const includeDetailsParameter = url.searchParams.get('includeDetails');
    const includeDetails = includeDetailsParameter !== 'false';

    if (!formId) {
      return Response.json({ error: 'Missing formId' }, { status: 400 });
    }

    const requestedFields = fieldsParameter.split(',').filter(Boolean);

    // Fetch submissions for this form
    const submissions = await request.payload.find({
      collection: 'form-submissions',
      where: {
        form: { equals: formId },
        'helper-jobs': { exists: true },
      },
      limit: 10_000,
      depth: 1, // Populate helper jobs
    });

    // Fetch all jobs to build the summary
    const allJobs = await request.payload.find({
      collection: 'helper-jobs',
      limit: 10_000,
      depth: 0,
    });

    const jobsById = new Map<string, HelperJob>(
      allJobs.docs.map((job) => [job.id, job as unknown as HelperJob]),
    );

    const counts = new Map<string, number>();
    const ressortGroups = new Map<string, Array<[string, string, string]>>();

    for (const sub of submissions.docs) {
      const formSub = sub as unknown as FormSubmission;
      const matchedJobs = Array.isArray(formSub['helper-jobs']) ? formSub['helper-jobs'] : [];

      const subData = Array.isArray(formSub.submissionData) ? formSub.submissionData : [];

      const contactString = requestedFields
        .map((field) => {
          const f = subData.find((d) => d.field === field);
          return f ? f.value : null;
        })
        .filter(Boolean)
        .join(', ');

      for (const index of matchedJobs) {
        const jid = typeof index === 'string' ? index : index.id;
        counts.set(jid, (counts.get(jid) || 0) + 1);

        const jobObject =
          typeof index === 'string' ? jobsById.get(index) : (index as unknown as HelperJob);
        if (!jobObject) continue;

        const categoryValue = jobObject.category;
        const categoryLabelDe =
          RESSORT_OPTIONS.find((o) => o.value === categoryValue)?.label.de ?? categoryValue;

        if (!ressortGroups.has(categoryLabelDe)) ressortGroups.set(categoryLabelDe, []);

        const zeitraumMap: Record<string, string> = {
          setup: 'Aufbaulager Infrastruktur',
          main: 'Hauptlager',
          teardown: 'Abbaulager Infrastruktur',
        };
        const zeitraum = zeitraumMap[jobObject.dateRangeCategory] ?? jobObject.dateRangeCategory;

        const currentGroup = ressortGroups.get(categoryLabelDe);
        if (currentGroup) {
          currentGroup.push([jobObject.title || 'Ohne Titel', zeitraum, contactString]);
        }
      }
    }

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

        document_
          .fontSize(20)
          .text(`Stand Helfenden Anmeldung ${new Date().toISOString()}`, { align: 'center' });
        document_.moveDown();

        const ressortStats = new Map<
          string,
          { totalJobs: number; fullJobs: number; totalQuota: number; filledQuota: number }
        >();
        let overallTotalJobs = 0;
        let overallFullJobs = 0;
        let overallTotalQuota = 0;
        let overallFilledQuota = 0;

        for (const job of allJobs.docs) {
          const hj = job as unknown as HelperJob;
          const c = counts.get(hj.id) || 0;
          const isFull = !!hj.maxQuota && c >= hj.maxQuota;

          const categoryValue = hj.category;
          const categoryLabelDe =
            RESSORT_OPTIONS.find((o) => o.value === categoryValue)?.label.de ?? categoryValue;

          overallTotalJobs++;
          if (isFull) overallFullJobs++;
          if (hj.maxQuota) {
            overallTotalQuota += hj.maxQuota;
            // Cap the filled quota at maxQuota so we don't go over 100% inappropriately, or let it show > 100% (often helpful for overbooking). Let's use `c`.
            overallFilledQuota += c;
          }

          const stat = ressortStats.get(categoryLabelDe) || {
            totalJobs: 0,
            fullJobs: 0,
            totalQuota: 0,
            filledQuota: 0,
          };
          stat.totalJobs++;
          if (isFull) stat.fullJobs++;
          if (hj.maxQuota) {
            stat.totalQuota += hj.maxQuota;
            stat.filledQuota += c;
          }
          ressortStats.set(categoryLabelDe, stat);
        }

        const statRows = [...ressortStats.entries()].map(([name, stat]) => {
          const jobPct =
            stat.totalJobs > 0 ? Math.round((stat.fullJobs / stat.totalJobs) * 100) : 0;
          const quotaPct =
            stat.totalQuota > 0 ? Math.round((stat.filledQuota / stat.totalQuota) * 100) : 0;
          return [
            name,
            `${stat.fullJobs} / ${stat.totalJobs} (${jobPct}%)`,
            stat.totalQuota > 0
              ? `${stat.filledQuota} / ${stat.totalQuota} (${quotaPct}%)`
              : `${stat.filledQuota} / Unlimitiert`,
          ];
        });

        const overallJobPct =
          overallTotalJobs > 0 ? Math.round((overallFullJobs / overallTotalJobs) * 100) : 0;
        const overallQuotaPct =
          overallTotalQuota > 0 ? Math.round((overallFilledQuota / overallTotalQuota) * 100) : 0;
        statRows.unshift([
          'Gesamttotal (Overall)',
          `${overallFullJobs} / ${overallTotalJobs} (${overallJobPct}%)`,
          overallTotalQuota > 0
            ? `${overallFilledQuota} / ${overallTotalQuota} (${overallQuotaPct}%)`
            : `${overallFilledQuota} / Unlimitiert`,
        ]);

        document_.table({
          title: 'Auslastung (Statistik)',
          headers: ['Ressort', 'Komplett Besetzte Jobs', 'Helfer Count'],
          rows: statRows,
        });

        document_.moveDown();

        // Summary Table
        const summaryRows = allJobs.docs.map((job) => {
          const hj = job as unknown as HelperJob;
          const c = counts.get(hj.id) || 0;
          const quota = hj.maxQuota ? hj.maxQuota : 'Unlimitiert';
          const isFull = hj.maxQuota && c >= hj.maxQuota;

          return [hj.title || 'Ohne Titel', `${c} / ${quota}`, isFull ? 'Voll' : 'Offen'];
        });

        if (summaryRows.length > 0) {
          document_.table({
            title: 'Jobs Uebersicht',
            headers: ['Job Titel', 'Registriert / Quota', 'Status'],
            rows: summaryRows,
          });
        } else {
          document_.fontSize(12).text('Keine Jobs vorhanden.');
        }

        if (includeDetails) {
          // Details Tables
          for (const [ressort, rows] of ressortGroups.entries()) {
            document_.addPage();
            document_.table({
              title: ressort,
              headers: ['Job Titel', 'Zeitraum Kategorie', 'Kontakt Details'],
              rows: rows,
            });
          }
        }

        document_.end();
      } catch (error) {
        reject(error);
      }
    });

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="HelferReport.pdf"',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('PDF Gen Error:', error.message, error.stack);
    }
    request.payload.logger.error({ err: error }, 'Failed to generate PDF Report');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
