import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AccessOverviewUserPicker } from '@/features/payload-cms/payload-cms/components/access-overview/access-overview-user-picker';
import { MergeUsersButton } from '@/features/payload-cms/payload-cms/components/merge-users/merge-users-button';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { ReferenceCount } from '@/features/payload-cms/payload-cms/views/merge-users-data';
import { countUserReferences } from '@/features/payload-cms/payload-cms/views/merge-users-data';
import type { User } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Banner, Gutter, SetStepNav } from '@payloadcms/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps, BasePayload } from 'payload';
import type React from 'react';

const SOURCE_PARAMETER = 'source';
const TARGET_PARAMETER = 'target';

const title: StaticTranslationString = {
  de: 'Benutzer zusammenführen',
  en: 'Merge users',
  fr: 'Fusionner des utilisateurs',
};

const intro: StaticTranslationString = {
  de: 'Für eine Person, die zweimal als Benutzer existiert, zum Beispiel einmal importiert und einmal über die Cevi.DB angemeldet. Alles, was am ersten Benutzer hängt – Chats, Nachrichten, Anmeldungen, Schichten, Formulare – geht an den zweiten über, und der erste wird gelöscht. Das lässt sich nicht rückgängig machen.',
  en: 'For one person who exists as two users, for example imported once and logged in through Cevi.DB once. Everything attached to the first user – chats, messages, enrolments, shifts, forms – moves to the second, and the first is deleted. This cannot be undone.',
  fr: 'Pour une personne qui existe deux fois comme utilisateur, par exemple importée une fois et connectée une fois via Cevi.DB. Tout ce qui est rattaché au premier utilisateur – chats, messages, inscriptions, services, formulaires – passe au second, et le premier est supprimé. Cette action est irréversible.',
};

const sourceLabel: StaticTranslationString = {
  de: 'Wird gelöscht',
  en: 'Is deleted',
  fr: 'Est supprimé',
};

const targetLabel: StaticTranslationString = {
  de: 'Bleibt bestehen',
  en: 'Stays',
  fr: 'Est conservé',
};

const pickerPlaceholder: StaticTranslationString = {
  de: 'Person suchen: Name, Ceviname oder E-Mail',
  en: 'Find a person: name, Cevi name or email',
  fr: 'Chercher une personne : nom, nom Cevi ou e-mail',
};

const pickerNoResults: StaticTranslationString = {
  de: 'Niemand gefunden',
  en: 'Nobody found',
  fr: 'Aucune personne trouvée',
};

const pickerSearchFailed: StaticTranslationString = {
  de: 'Die Suche ist fehlgeschlagen.',
  en: 'The search failed.',
  fr: 'La recherche a échoué.',
};

const emailLabel: StaticTranslationString = { de: 'E-Mail', en: 'Email', fr: 'E-mail' };

const ceviDatabaseIdLabel: StaticTranslationString = {
  de: 'Cevi.DB-ID',
  en: 'Cevi.DB id',
  fr: 'ID Cevi.DB',
};

const notLinkedLabel: StaticTranslationString = {
  de: 'nicht mit der Cevi.DB verknüpft',
  en: 'not linked to Cevi.DB',
  fr: 'non lié à Cevi.DB',
};

const createdLabel: StaticTranslationString = {
  de: 'Erstellt am',
  en: 'Created on',
  fr: 'Créé le',
};

const openUserLabel: StaticTranslationString = {
  de: 'Benutzer öffnen',
  en: 'Open user',
  fr: "Ouvrir l'utilisateur",
};

const movedLabel: StaticTranslationString = {
  de: 'Das geht an den Benutzer über, der bestehen bleibt',
  en: 'This moves to the user that stays',
  fr: "Ceci passe à l'utilisateur conservé",
};

const nothingToMoveLabel: StaticTranslationString = {
  de: 'An diesem Benutzer hängt nichts. Er wird nur gelöscht.',
  en: 'Nothing is attached to this user. It is only deleted.',
  fr: "Rien n'est rattaché à cet utilisateur. Il est seulement supprimé.",
};

const storeLabels: Record<ReferenceCount['store'], StaticTranslationString> = {
  postgres: { de: 'App-Daten', en: 'App data', fr: "Données de l'app" },
  payload: { de: 'Inhalte im Adminpanel', en: 'Admin panel content', fr: "Contenus de l'admin" },
};

const samePersonWarning: StaticTranslationString = {
  de: 'Zweimal derselbe Benutzer. Wähle zwei verschiedene.',
  en: 'The same user twice. Pick two different ones.',
  fr: 'Deux fois le même utilisateur. Choisis-en deux différents.',
};

const ownAccountWarning: StaticTranslationString = {
  de: 'Das ist dein eigener Benutzer. Er kann bestehen bleiben, aber nicht gelöscht werden.',
  en: 'This is your own user. It can stay, but it cannot be deleted.',
  fr: "C'est ton propre utilisateur. Il peut être conservé, mais pas supprimé.",
};

const bothLinkedWarning: StaticTranslationString = {
  de: 'Beide Benutzer sind mit der Cevi.DB verknüpft, mit verschiedenen IDs. Der Benutzer, der bleibt, behält seine ID. Meldet sich jemand mit der anderen ID wieder an, entsteht ein neuer Benutzer. Führe sie nur zusammen, wenn die andere ID in der Cevi.DB nicht mehr existiert.',
  en: 'Both users are linked to Cevi.DB, with different ids. The user that stays keeps its id. If someone logs in with the other id again, a new user is created. Merge them only if the other id no longer exists in Cevi.DB.',
  fr: "Les deux utilisateurs sont liés à Cevi.DB, avec des ID différents. L'utilisateur conservé garde son ID. Si quelqu'un se reconnecte avec l'autre ID, un nouvel utilisateur est créé. Ne les fusionne que si l'autre ID n'existe plus dans Cevi.DB.",
};

const takesOverLinkNote: StaticTranslationString = {
  de: 'Der Benutzer, der bleibt, war noch nie über die Cevi.DB angemeldet. Er übernimmt die Cevi.DB-ID, die E-Mail, den Namen und die Gruppen des anderen.',
  en: 'The user that stays has never logged in through Cevi.DB. It takes over the Cevi.DB id, email, name and groups of the other one.',
  fr: "L'utilisateur conservé ne s'est jamais connecté via Cevi.DB. Il reprend l'ID Cevi.DB, l'e-mail, le nom et les groupes de l'autre.",
};

const buttonLabels: Record<
  'button' | 'confirmTitle' | 'confirmMessage' | 'submitting' | 'merged' | 'forbidden' | 'failed',
  StaticTranslationString
> = {
  button: { de: 'Zusammenführen', en: 'Merge', fr: 'Fusionner' },
  confirmTitle: {
    de: 'Benutzer zusammenführen?',
    en: 'Merge the users?',
    fr: 'Fusionner les utilisateurs ?',
  },
  confirmMessage: {
    de: '{source} wird gelöscht, und alles geht an {target} über. Das lässt sich nicht rückgängig machen.',
    en: '{source} is deleted, and everything moves to {target}. This cannot be undone.',
    fr: '{source} est supprimé, et tout passe à {target}. Cette action est irréversible.',
  },
  submitting: { de: 'Wird zusammengeführt …', en: 'Merging …', fr: 'Fusion en cours …' },
  merged: {
    de: 'Die Benutzer sind zusammengeführt.',
    en: 'The users are merged.',
    fr: 'Les utilisateurs sont fusionnés.',
  },
  forbidden: {
    de: 'Nur Admins dürfen Benutzer zusammenführen.',
    en: 'Only admins may merge users.',
    fr: 'Seuls les admins peuvent fusionner des utilisateurs.',
  },
  failed: {
    de: 'Das Zusammenführen ist fehlgeschlagen. Starte es noch einmal; was schon verschoben ist, bleibt verschoben.',
    en: 'The merge failed. Start it again; what has already moved stays moved.',
    fr: 'La fusion a échoué. Relance-la ; ce qui est déjà déplacé le reste.',
  },
};

const DATE_LOCALES: Record<Locale, string> = { de: 'de-CH', en: 'en-GB', fr: 'fr-CH' };

const findUser = async (
  payload: BasePayload,
  id: string | undefined,
): Promise<User | undefined> => {
  if (id === undefined || id === '') return undefined;
  const user = await payload.findByID({ collection: 'users', id, depth: 0, disableErrors: true });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return user ?? undefined;
};

const isLinked = (user: User): boolean => typeof user.cevi_db_uuid === 'number';

const UserPanel: React.FC<{
  label: string;
  parameter: string;
  user: User | undefined;
  locale: Locale;
  adminRoute: string;
  apiRoute: string;
}> = ({ label, parameter, user, locale, adminRoute, apiRoute }) => (
  <div className="flex flex-1 flex-col gap-2">
    <label htmlFor={`merge-users-${parameter}`} className="text-sm font-semibold">
      {label}
    </label>
    <AccessOverviewUserPicker
      apiRoute={apiRoute}
      parameter={parameter}
      inputId={`merge-users-${parameter}`}
      selected={
        user === undefined ? undefined : { id: user.id, label: user.displayName ?? user.id }
      }
      placeholder={pickerPlaceholder[locale]}
      noResults={pickerNoResults[locale]}
      searchFailed={pickerSearchFailed[locale]}
    />
    {user !== undefined && (
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-(--theme-elevation-600)">{emailLabel[locale]}</dt>
        <dd className="m-0">{user.email}</dd>
        <dt className="text-(--theme-elevation-600)">{ceviDatabaseIdLabel[locale]}</dt>
        <dd className="m-0">{user.cevi_db_uuid ?? notLinkedLabel[locale]}</dd>
        <dt className="text-(--theme-elevation-600)">{createdLabel[locale]}</dt>
        <dd className="m-0">{new Date(user.createdAt).toLocaleDateString(DATE_LOCALES[locale])}</dd>
        <dd className="col-span-2 m-0">
          <Link
            href={`${adminRoute}/collections/users/${user.id}`}
            className="underline underline-offset-2"
          >
            {openUserLabel[locale]}
          </Link>
        </dd>
      </dl>
    )}
  </div>
);

const ReferenceList: React.FC<{ references: ReferenceCount[]; locale: Locale }> = ({
  references,
  locale,
}) => {
  if (references.length === 0) {
    return <p className="text-sm text-(--theme-elevation-600)">{nothingToMoveLabel[locale]}</p>;
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <span className="font-semibold">{movedLabel[locale]}</span>
      {(['postgres', 'payload'] as const).map((store) => {
        const rows = references.filter((reference) => reference.store === store);
        if (rows.length === 0) return;
        return (
          <div key={store}>
            <div className="mb-1 text-xs font-semibold tracking-wide uppercase opacity-60">
              {storeLabels[store][locale]}
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {rows.map((reference) => (
                <li
                  key={reference.name}
                  className="flex max-w-md justify-between border-t border-current/10 py-1"
                >
                  <span>{reference.name}</span>
                  <span className="tabular-nums">{reference.count}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Admin view at `/admin/merge-users`: merges two user records of one person into one. The two
 * users are picked into the address, the page then shows both and counts what would move, and
 * the merge only runs after a confirmation. Only full admins may open it; everyone else is sent
 * back to the dashboard.
 */
export default async function MergeUsersView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps): Promise<React.ReactElement> {
  const { req, permissions, visibleEntities, locale: adminLocale } = initPageResult;
  const { payload, i18n, user } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user || !isFullAdmin({ req })) redirect(adminRoute);
  const locale: Locale = getAdminLocale(i18n);

  const parameter = (name: string): string | undefined => {
    const value = searchParams?.[name];
    return typeof value === 'string' ? value : undefined;
  };
  const [source, target] = await Promise.all([
    findUser(payload, parameter(SOURCE_PARAMETER)),
    findUser(payload, parameter(TARGET_PARAMETER)),
  ]);
  const references = source === undefined ? [] : await countUserReferences(payload, source.id);

  const isSamePerson = source !== undefined && source.id === target?.id;
  const isOwnAccount = source?.id === String(user.id);
  const canMerge = source !== undefined && target !== undefined && !isSamePerson && !isOwnAccount;
  const describe = (text: string): string =>
    text
      .replace('{source}', source?.displayName ?? '')
      .replace('{target}', target?.displayName ?? '');

  return (
    <DefaultTemplate
      i18n={i18n}
      {...(adminLocale === undefined ? {} : { locale: adminLocale })}
      {...(params === undefined ? {} : { params })}
      payload={payload}
      permissions={permissions}
      {...(searchParams === undefined ? {} : { searchParams })}
      user={user}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: title[locale] }]} />
      <Gutter className="flex flex-col gap-6 pt-8 pb-16">
        <div>
          <h1 className="mb-1 text-3xl font-bold">{title[locale]}</h1>
          <p className="max-w-3xl opacity-70">{intro[locale]}</p>
        </div>

        <div className="flex max-w-5xl flex-col gap-8 md:flex-row">
          <UserPanel
            label={sourceLabel[locale]}
            parameter={SOURCE_PARAMETER}
            user={source}
            locale={locale}
            adminRoute={adminRoute}
            apiRoute={payload.config.routes.api}
          />
          <UserPanel
            label={targetLabel[locale]}
            parameter={TARGET_PARAMETER}
            user={target}
            locale={locale}
            adminRoute={adminRoute}
            apiRoute={payload.config.routes.api}
          />
        </div>

        {isSamePerson && <Banner type="error">{samePersonWarning[locale]}</Banner>}
        {isOwnAccount && <Banner type="error">{ownAccountWarning[locale]}</Banner>}
        {canMerge && isLinked(source) && isLinked(target) && (
          <Banner type="error">{bothLinkedWarning[locale]}</Banner>
        )}
        {canMerge && isLinked(source) && !isLinked(target) && (
          <Banner type="info">{takesOverLinkNote[locale]}</Banner>
        )}

        {source !== undefined && <ReferenceList references={references} locale={locale} />}

        {canMerge && (
          <div>
            <MergeUsersButton
              sourceId={source.id}
              targetId={target.id}
              targetHref={`${adminRoute}/collections/users/${target.id}`}
              locale={locale}
              labels={{
                button: buttonLabels.button[locale],
                confirmTitle: buttonLabels.confirmTitle[locale],
                confirmMessage: describe(buttonLabels.confirmMessage[locale]),
                submitting: buttonLabels.submitting[locale],
                merged: buttonLabels.merged[locale],
                forbidden: buttonLabels.forbidden[locale],
                failed: buttonLabels.failed[locale],
              }}
            />
          </div>
        )}
      </Gutter>
    </DefaultTemplate>
  );
}
