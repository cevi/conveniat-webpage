import { environmentVariables } from '@/config/environment-variables';
import { MaterialSetupForms } from '@/features/material/payload-cms/material-setup-forms';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import prisma from '@/lib/db/prisma';
import type { StaticTranslationString } from '@/types/types';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Banner, Gutter, SetStepNav } from '@payloadcms/ui';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import type React from 'react';

const title: StaticTranslationString = {
  de: 'Materialdepot einrichten',
  en: 'Set up the material depot',
  fr: 'Configurer le dépôt de matériel',
};

const intro: StaticTranslationString = {
  de: 'Hier wird das Materialdepot einmal eingerichtet: Kategorien und der erste Katalog. Alles, was im Lager passiert – reservieren, ausgeben, zurücknehmen, Schäden, Bestand und neue Artikel – erledigt das Materialteam in der App.',
  en: 'This is where the material depot is set up once: categories and the first catalogue. Everything that happens at the depot – reserving, handing out, taking back, damage, stock and new items – the material team does in the app.',
  fr: 'Ici, le dépôt de matériel est configuré une fois : catégories et premier catalogue. Tout ce qui se passe au dépôt – réserver, remettre, reprendre, dégâts, stock et nouveaux articles – l’équipe matériel le fait dans l’app.',
};

const openApp: StaticTranslationString = {
  de: 'Materialdepot in der App öffnen',
  en: 'Open the material depot in the app',
  fr: 'Ouvrir le dépôt de matériel dans l’app',
};

const teamLabel: StaticTranslationString = {
  de: 'Materialteam (Cevi.DB-Gruppen aus CEVIDB_GROUP_MATERIAL_TEAM, dazu alle Admins)',
  en: 'Material team (Cevi.DB groups from CEVIDB_GROUP_MATERIAL_TEAM, plus all admins)',
  fr: 'Équipe matériel (groupes Cevi.DB de CEVIDB_GROUP_MATERIAL_TEAM, plus tous les admins)',
};

const noTeamGroup: StaticTranslationString = {
  de: 'keine Gruppe gesetzt, nur Admins',
  en: 'no group set, admins only',
  fr: 'aucun groupe, seulement les admins',
};

const itemsLabel: StaticTranslationString = {
  de: 'Artikel im Katalog',
  en: 'Items in the catalogue',
  fr: 'Articles au catalogue',
};

const hoefeLabel: StaticTranslationString = {
  de: 'Höfe, auf die ausgeliehen wird',
  en: 'Hofs that borrow material',
  fr: 'Hofs qui empruntent du matériel',
};

const openHoefe: StaticTranslationString = {
  de: 'Höfe verwalten',
  en: 'Manage the Hofs',
  fr: 'Gérer les Hofs',
};

const hoefeSource: StaticTranslationString = {
  de: 'Die Höfe kommen aus dem Cevi.DB-Abgleich («Anlässe automatisch aus Cevi.DB laden» unter Höfe). Leitende eines Hofs und alle, die für seine Anlässe angemeldet sind, sehen seine Ausleihen und können für ihn reservieren.',
  en: 'The Hofs come from the Cevi.DB sync (“Load events automatically from Cevi.DB” under Hofs). The leaders of a Hof and everyone registered for its events see its loans and can book for it.',
  fr: 'Les Hofs viennent de la synchronisation Cevi.DB (« Charger les événements automatiquement depuis Cevi.DB » sous Hofs). Les responsables d’un Hof et toutes les personnes inscrites à ses événements voient ses prêts et peuvent réserver pour lui.',
};

const disabledWarning: StaticTranslationString = {
  de: 'FEATURE_ENABLE_MATERIAL_MANAGEMENT ist auf dieser Instanz aus: die App zeigt das Materialdepot noch nicht.',
  en: 'FEATURE_ENABLE_MATERIAL_MANAGEMENT is off on this instance: the app does not show the material depot yet.',
  fr: 'FEATURE_ENABLE_MATERIAL_MANAGEMENT est désactivé sur cette instance : l’app n’affiche pas encore le dépôt.',
};

/**
 * Admin view at `/admin/material-setup` for the one-off setup of the material depot. The
 * depot's data lives in Postgres, not in Payload, so this page reads it with Prisma and writes
 * through the server actions next to it. Only full admins open it: the material team does not
 * log into the admin panel, it runs the depot in the app.
 */
export default async function MaterialSetupView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps): Promise<React.ReactElement> {
  const { req, permissions, visibleEntities, locale: adminLocale } = initPageResult;
  const { payload, i18n, user } = req;
  if (!(await isFullAdmin({ req }))) redirect(payload.config.routes.admin);
  const locale = getAdminLocale(i18n);

  const [categories, itemCount, hoefe] = await Promise.all([
    prisma.materialCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { items: true } } },
    }),
    prisma.materialItem.count(),
    payload.count({ collection: 'hoefe', overrideAccess: true }),
  ]);
  const teamGroups = environmentVariables.CEVIDB_GROUP_MATERIAL_TEAM;

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
        <p className="mb-4 max-w-3xl opacity-70">{intro[locale]}</p>
        {!environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT && (
          <Banner type="warning">{disabledWarning[locale]}</Banner>
        )}
        <dl className="mb-2 grid gap-x-6 gap-y-1 text-sm md:grid-cols-[auto_1fr]">
          <dt className="font-semibold">{teamLabel[locale]}</dt>
          <dd>{teamGroups.length === 0 ? noTeamGroup[locale] : teamGroups.join(', ')}</dd>
          <dt className="font-semibold">{itemsLabel[locale]}</dt>
          <dd>
            {itemCount} ·{' '}
            <a className="underline" href="/app/material/team" target="_blank" rel="noreferrer">
              {openApp[locale]}
            </a>
          </dd>
          <dt className="font-semibold">{hoefeLabel[locale]}</dt>
          <dd>
            {hoefe.totalDocs} ·{' '}
            <a className="underline" href={`${payload.config.routes.admin}/collections/hoefe`}>
              {openHoefe[locale]}
            </a>
          </dd>
        </dl>
        <p className="mb-6 max-w-3xl text-sm opacity-70">{hoefeSource[locale]}</p>
        <MaterialSetupForms
          locale={locale}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            sortOrder: category.sortOrder,
            itemCount: category._count.items,
          }))}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
