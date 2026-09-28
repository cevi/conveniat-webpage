import { environmentVariables } from '@/config/environment-variables';
import { listAccessibleHoefe } from '@/features/hof-dashboard/api/accessible-hoefe';
import { listHofFiles, zipHofFiles } from '@/features/hof-dashboard/api/hof-files-zip';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

const logger = createLogger('api:hof-dashboard-files');

/**
 * Every file a Hof handed in, as one ZIP, for whoever may open the Hof's dashboard: the
 * reviewers any Hof, a Hof's address administrators their own.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hofId: string }> },
): Promise<Response> {
  if (!environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { hofId } = await params;
  const session = await auth();
  const user = session?.user;
  if (!isValidNextAuthUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await getPayload({ config });
  const hoefe = await listAccessibleHoefe(payload, user);
  const hof = hoefe.find((candidate) => candidate.id === hofId);
  if (hof === undefined) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const files = await listHofFiles(hof.id, await getLocaleFromCookies());
  logger.info('Sent the files of a Hof as a ZIP', {
    'hof_dashboard.hof_id': hof.id,
    'hof_dashboard.files': files.length,
  });

  const filename = `${hof.name}.zip`;
  return new Response(zipHofFiles(files), {
    headers: {
      'Content-Type': 'application/zip',
      // the plain name for old clients, the full one for everyone else
      'Content-Disposition': `attachment; filename="${filename.replaceAll(/[^\w .()-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
