'use client';

import { SeedProfilePicturesButton } from '@/features/payload-cms/payload-cms/components/funktionen-sync/seed-profile-pictures-button';
import {
  useFunktionenSync,
  type FunktionenSyncState,
} from '@/features/payload-cms/payload-cms/components/funktionen-sync/use-funktionen-sync';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import {
  SyncFoundList,
  SyncProgressCard,
  syncPhaseOf,
} from '@/features/payload-cms/payload-cms/components/shared/sync-progress';
import type { FunktionenSyncResult } from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Button, useAuth, useListQuery, useLocale } from '@payloadcms/ui';
import { Download, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';

const cardTitle: StaticTranslationString = {
  de: 'Funktionen aus Cevi.DB abgleichen',
  en: 'Sync the functions from Cevi.DB',
  fr: 'Synchroniser les fonctions depuis Cevi.DB',
};

const cardDescription: StaticTranslationString = {
  de: 'Die Funktionen werden jede Nacht aus den Leitungen der Cevi.DB-Gruppen abgeglichen. Nach einer Änderung in der Cevi.DB lässt sich der Abgleich hier sofort starten. Bezeichnungen und Reihenfolge, die hier gesetzt wurden, bleiben erhalten.',
  en: 'The functions are synced every night from the leaders of the Cevi.DB groups. After a change in Cevi.DB, start the sync here right away. Labels and order set here are kept.',
  fr: "Les fonctions sont synchronisées chaque nuit à partir des responsables des groupes Cevi.DB. Après une modification dans Cevi.DB, lancez la synchronisation ici. Les libellés et l'ordre définis ici sont conservés.",
};

const startButtonLabel: StaticTranslationString = {
  de: 'Jetzt aus Cevi.DB abgleichen',
  en: 'Sync from Cevi.DB now',
  fr: 'Synchroniser depuis Cevi.DB',
};

const runningButtonLabel: StaticTranslationString = {
  de: 'Gleiche mit der Cevi.DB ab...',
  en: 'Syncing with Cevi.DB...',
  fr: 'Synchronisation avec Cevi.DB...',
};

const discoveringStatus: StaticTranslationString = {
  de: 'Untergruppen werden gesucht...',
  en: 'Looking up the subgroups...',
  fr: 'Recherche des sous-groupes...',
};

const readingStatus: StaticTranslationString = {
  de: 'Leitungen werden abgefragt...',
  en: 'Reading the leaders...',
  fr: 'Lecture des responsables...',
};

const doneStatus: StaticTranslationString = {
  de: 'Abgleich abgeschlossen',
  en: 'Sync finished',
  fr: 'Synchronisation terminée',
};

const errorStatus: StaticTranslationString = {
  de: 'Abgleich fehlgeschlagen',
  en: 'Sync failed',
  fr: 'La synchronisation a échoué',
};

const genericError: StaticTranslationString = {
  de: 'Verbindung zur Cevi.DB fehlgeschlagen. Die Funktionen bleiben, wie sie waren.',
  en: 'Could not connect to Cevi.DB. The functions stay as they were.',
  fr: 'Échec de la connexion à Cevi.DB. Les fonctions restent inchangées.',
};

const foundHeading: StaticTranslationString = {
  de: 'Gruppen mit Leitung',
  en: 'Groups with leaders',
  fr: 'Groupes avec responsables',
};

const noneFoundYet: StaticTranslationString = {
  de: 'Noch keine Gruppe mit Leitung gefunden.',
  en: 'No group with leaders found yet.',
  fr: 'Aucun groupe avec responsables trouvé pour le moment.',
};

const listRefreshFailed: StaticTranslationString = {
  de: 'Die Liste unten konnte nicht automatisch aktualisiert werden — bitte die Seite neu laden.',
  en: 'The list below could not be refreshed automatically — please reload the page.',
  fr: "La liste ci-dessous n'a pas pu être actualisée automatiquement — veuillez recharger la page.",
};

const reloadButtonLabel: StaticTranslationString = {
  de: 'Seite neu laden',
  en: 'Reload page',
  fr: 'Recharger la page',
};

const leadersLabel = (locale: Locale, count: number): string => {
  if (locale === 'en') return count === 1 ? '1 leader' : `${String(count)} leaders`;
  if (locale === 'fr') return count === 1 ? '1 responsable' : `${String(count)} responsables`;
  return count === 1 ? '1 Leitung' : `${String(count)} Leitende`;
};

const progressSummary = (locale: Locale, processed: number, total: number): string => {
  const counts = total > 0 ? `${String(processed)}/${String(total)}` : String(processed);
  if (locale === 'en') return `${counts} groups`;
  if (locale === 'fr') return `${counts} groupes`;
  return `${counts} Gruppen`;
};

const resultSummary = (locale: Locale, result: FunktionenSyncResult): string => {
  const { created, updated, removed, usersWritten } = result;
  if (locale === 'en') {
    return `${String(created)} new, ${String(updated)} updated, ${String(removed)} removed; ${String(usersWritten)} people updated.`;
  }
  if (locale === 'fr') {
    return `${String(created)} nouvelle(s), ${String(updated)} mise(s) à jour, ${String(removed)} supprimée(s) ; ${String(usersWritten)} personne(s) mise(s) à jour.`;
  }
  return `${String(created)} neu, ${String(updated)} aktualisiert, ${String(removed)} entfernt; ${String(usersWritten)} Personen nachgeführt.`;
};

/** The tree is walked first, without a known size; the bar fills while the leaders are read. */
const percentageOf = (state: FunktionenSyncState): number => {
  if (state.phase === 'done') return 100;
  if (state.totalGroups === 0) return 0;
  return Math.round((state.processedGroups / state.totalGroups) * 100);
};

/**
 * Rendered above the list of the functions: starts the Cevi.DB sync of the camp functions and
 * shows its progress, like the event import above the list of the Höfe. Only shown to those
 * who may edit the functions; the endpoint refuses everybody else anyway.
 */
export const FunktionenSyncButton: React.FC = () => {
  const locale = resolveAdminLocale(useLocale().code);
  const { permissions } = useAuth();
  const { query, refineListData } = useListQuery();
  const [didRefreshList, setDidRefreshList] = useState(true);

  // the functions were written server-side; the table renders from the list query
  const refreshList = useCallback(async (): Promise<void> => {
    try {
      await refineListData(query);
      setDidRefreshList(true);
    } catch {
      setDidRefreshList(false);
    }
  }, [query, refineListData]);

  const { state, isRunning, start } = useFunktionenSync(refreshList);

  if (permissions?.collections?.['funktionen']?.update !== true) return <></>;

  const percentage = percentageOf(state);

  const statusText = {
    idle: '',
    discovering: discoveringStatus[locale],
    reading: readingStatus[locale],
    done: doneStatus[locale],
    error: errorStatus[locale],
  }[state.phase];

  return (
    <div className="mb-5 rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-50) p-4">
      <h4 className="m-0 mb-2 text-[15px] font-semibold text-(--theme-elevation-900)">
        {cardTitle[locale]}
      </h4>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-(--theme-elevation-600)">
        {cardDescription[locale]}
      </p>

      <Button
        buttonStyle="primary"
        size="medium"
        margin={false}
        disabled={isRunning}
        icon={
          isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )
        }
        iconPosition="left"
        onClick={() => {
          setDidRefreshList(true);
          void start();
        }}
      >
        {isRunning ? runningButtonLabel[locale] : startButtonLabel[locale]}
      </Button>

      {state.phase !== 'idle' && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SyncProgressCard
            phase={syncPhaseOf(isRunning, state.phase === 'error')}
            status={statusText}
            percentage={percentage}
            summary={progressSummary(
              locale,
              state.phase === 'discovering' ? state.discoveredGroups : state.processedGroups,
              state.totalGroups,
            )}
            ariaLabel={cardTitle[locale]}
            error={state.phase === 'error' ? (state.error ?? genericError[locale]) : undefined}
          >
            {state.phase === 'done' && state.result !== undefined && (
              <>
                <p className="mt-3 mb-0 text-[13px] text-(--theme-elevation-700)">
                  {resultSummary(locale, state.result)}
                </p>
                {!didRefreshList && (
                  <>
                    <p className="mt-2 mb-0 text-[13px] text-(--theme-error-600)">
                      {listRefreshFailed[locale]}
                    </p>
                    <Button
                      buttonStyle="secondary"
                      size="small"
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                      iconPosition="left"
                      onClick={() => globalThis.location.reload()}
                    >
                      {reloadButtonLabel[locale]}
                    </Button>
                  </>
                )}
              </>
            )}
          </SyncProgressCard>

          <SyncFoundList
            heading={foundHeading[locale]}
            emptyText={noneFoundYet[locale]}
            items={state.found.map((group) => ({
              key: group.groupId,
              label: group.groupName,
              meta: leadersLabel(locale, group.leaders),
            }))}
            locale={locale}
          />
        </div>
      )}

      <SeedProfilePicturesButton locale={locale} />
    </div>
  );
};
