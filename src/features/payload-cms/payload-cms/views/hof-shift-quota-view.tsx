import { canManageHelperShifts } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { HofShiftQuotaGrid } from '@/features/payload-cms/payload-cms/components/hof-shift-quota-grid';
import { loadQuotaGrid } from '@/features/payload-cms/payload-cms/endpoints/hof-shift-quota-endpoints';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { StaticTranslationString } from '@/types/types';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter, SetStepNav } from '@payloadcms/ui';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import type React from 'react';

const title: StaticTranslationString = {
  de: 'Schicht-Kontingente',
  en: 'Shift quotas',
  fr: 'Quotas de services',
};

const intro: StaticTranslationString = {
  de: 'Wie viele Schichteinsätze jeder Hof pro Tag übernimmt, verteilt nach der Zahl seiner Leitenden. Zwei Einsätze einer Person zählen doppelt. Das Kontingent ist ein Ziel, keine Grenze: die AVP sieht es und den Stand ihres Hofs in der App.',
  en: 'How many shifts each Hof takes on per day, spread by the number of its leaders. Two shifts of one person count twice. The quota is a target, not a limit: the AVP sees it and where their Hof stands in the app.',
  fr: 'Combien de services chaque Hof assure par jour, répartis selon le nombre de ses responsables. Deux services d’une même personne comptent deux fois. Le quota est un objectif, pas une limite : l’AVP le voit dans l’app, avec l’avancement de son Hof.',
};

/**
 * Admin view at `/admin/schicht-kontingente`: the Helferpool sets what each Hof takes on per
 * camp day. The quotas live in Postgres, beside the enrolments they are counted against, and
 * the grid writes them through the endpoints of the Schichteinsätze.
 */
export default async function HofShiftQuotaView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps): Promise<React.ReactElement> {
  const { req, permissions, visibleEntities, locale: adminLocale } = initPageResult;
  const { payload, i18n, user } = req;
  if (!canManageHelperShifts({ req })) redirect(payload.config.routes.admin);
  const locale = getAdminLocale(i18n);
  const grid = await loadQuotaGrid(req);

  return (
    <DefaultTemplate
      i18n={i18n}
      {...(adminLocale === undefined ? {} : { locale: adminLocale })}
      {...(params === undefined ? {} : { params })}
      payload={payload}
      permissions={permissions}
      {...(searchParams === undefined ? {} : { searchParams })}
      {...(user ? { user } : {})}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: title[locale] }]} />
      <Gutter className="flex flex-col pt-8 pb-16">
        <h1 className="mb-1 text-3xl font-bold">{title[locale]}</h1>
        <p className="mb-6 max-w-3xl opacity-70">{intro[locale]}</p>
        <HofShiftQuotaGrid initialGrid={grid} locale={locale} />
      </Gutter>
    </DefaultTemplate>
  );
}
