import { environmentVariables } from '@/config/environment-variables';
import {
  isHofDashboardReviewer,
  listAccessibleHoefe,
} from '@/features/hof-dashboard/api/accessible-hoefe';
import {
  getMaterialOrders,
  recordMaterialOrderExport,
} from '@/features/hof-dashboard/api/material-orders';
import {
  buildMaterialOrderWorkbook,
  MATERIAL_EXPORT_SHEETS,
  type MaterialExportSheet,
} from '@/features/hof-dashboard/api/material-orders-export';
import { translate } from '@/features/hof-dashboard/texts';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

const logger = createLogger('api:hof-dashboard-material-orders');

const isSheet = (value: string): value is MaterialExportSheet =>
  (MATERIAL_EXPORT_SHEETS as readonly string[]).includes(value);

/**
 * The material orders of every Hof as an Excel workbook, for the reviewers. `form` names the
 * forms to export, every material form when left out; `sheet` names the sheets. Records the
 * time of the export for the forms in it, so the Ressort sees which orders changed after it.
 */
export async function GET(request: Request): Promise<Response> {
  if (!environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const session = await auth();
  const user = session?.user;
  if (!isValidNextAuthUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isHofDashboardReviewer(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sheets = new Set(searchParams.getAll('sheet').filter((sheet) => isSheet(sheet)));
  if (sheets.size === 0) {
    return NextResponse.json({ error: 'No sheet chosen' }, { status: 400 });
  }
  const formIds = new Set(searchParams.getAll('form'));

  const locale = await getLocaleFromCookies();
  const hoefe = await listAccessibleHoefe(await getPayload({ config }), user);
  const orders = await getMaterialOrders(hoefe, locale);
  const forms = orders.filter((form) => formIds.size === 0 || formIds.has(form.id));
  if (forms.length === 0) {
    return NextResponse.json({ error: 'No material form' }, { status: 404 });
  }

  const now = new Date();
  const workbook = await buildMaterialOrderWorkbook(forms, sheets, locale);
  await recordMaterialOrderExport(
    forms.map((form) => form.id),
    now,
  );
  logger.info('Exported the material orders', {
    'hof_dashboard.forms': forms.length,
    'hof_dashboard.hoefe': hoefe.length,
    'hof_dashboard.sheets': [...sheets].join(','),
  });

  const filename = `${translate('xlsxFilename', locale)} ${now.toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(workbook), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename.replaceAll(/[^\w .()-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
