'use client';

import type { PopulateSubeventsState } from '@/features/billing/hooks/use-populate-subevents';
import { usePopulateSubevents } from '@/features/billing/hooks/use-populate-subevents';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import {
  SyncFoundList,
  SyncProgressCard,
  syncPhaseOf,
} from '@/features/payload-cms/payload-cms/components/shared/sync-progress';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Button, useAuth, useListQuery, useLocale } from '@payloadcms/ui';
import { Download, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';

const cardTitle: StaticTranslationString = {
  de: 'Anlässe automatisch aus Cevi.DB laden',
  en: 'Load events automatically from Cevi.DB',
  fr: 'Charger les événements automatiquement depuis Cevi.DB',
};

const cardDescriptionBefore: StaticTranslationString = {
  de: 'Klicken Sie auf den Button unten, um alle Untergruppen der ',
  en: 'Click the button below to query all subgroups of the ',
  fr: 'Cliquez sur le bouton ci-dessous pour interroger tous les sous-groupes du ',
};

const parentGroupLinkLabel: StaticTranslationString = {
  de: 'Hauptlager-Gruppe 4337',
  en: 'Hauptlager group 4337',
  fr: 'groupe Hauptlager 4337',
};

const cardDescriptionAfter: StaticTranslationString = {
  de: ' abzufragen. Es werden alle Anlässe mit dem Namen «Hauptlager conveniat27» oder «conveniat27» gesammelt; Aufbau- und Abbaulager werden übersprungen. Zusätzlich werden die Adressverwalter/-innen jedes Hofs als Empfänger der Erinnerung abgeglichen — bereits eingetragene abweichende Empfänger bleiben erhalten. Dieser Vorgang dauert ca. 45 Sekunden.',
  en: '. All events named “Hauptlager conveniat27” or “conveniat27” are collected; Aufbau- and Abbaulager events are skipped. The address managers of every Hof are also synced as the reminder recipients — recipient overrides you already entered are kept. This takes about 45 seconds.',
  fr: ". Tous les événements nommés « Hauptlager conveniat27 » ou « conveniat27 » sont collectés ; les événements Aufbaulager et Abbaulager sont ignorés. Les gestionnaires d'adresses de chaque Hof sont également synchronisés comme destinataires du rappel — les destinataires déjà remplacés manuellement sont conservés. Cette opération dure environ 45 secondes.",
};

const startButtonLabel: StaticTranslationString = {
  de: 'Subgruppen-Anlässe jetzt laden',
  en: 'Load subgroup events now',
  fr: 'Charger les événements des sous-groupes',
};

const runningButtonLabel: StaticTranslationString = {
  de: 'Lade Anlässe aus Cevi.DB...',
  en: 'Loading events from Cevi.DB...',
  fr: 'Chargement des événements depuis Cevi.DB...',
};

const confirmModalTitle: StaticTranslationString = {
  de: 'Subgruppen-Anlässe laden',
  en: 'Load subgroup events',
  fr: 'Charger les événements des sous-groupes',
};

const confirmModalMessage: StaticTranslationString = {
  de: 'Möchten Sie die Subgruppen-Anlässe aus Cevi.DB jetzt laden?\n\nNeue Anlässe werden der Liste hinzugefügt und bestehende Anlässe bleiben erhalten.',
  en: 'Do you want to load the subgroup events from Cevi.DB now?\n\nNew events are appended to the list, existing events are kept.',
  fr: 'Voulez-vous charger maintenant les événements des sous-groupes depuis Cevi.DB ?\n\nLes nouveaux événements sont ajoutés à la liste, les événements existants sont conservés.',
};

const confirmModalConfirmLabel: StaticTranslationString = {
  de: 'Jetzt laden',
  en: 'Load now',
  fr: 'Charger maintenant',
};

const walkingStatus: StaticTranslationString = {
  de: 'Untergruppen werden abgefragt...',
  en: 'Querying subgroups...',
  fr: 'Interrogation des sous-groupes...',
};

const savingStatus: StaticTranslationString = {
  de: 'Anlässe werden gespeichert...',
  en: 'Saving events...',
  fr: 'Enregistrement des événements...',
};

const doneStatus: StaticTranslationString = {
  de: 'Abfrage abgeschlossen',
  en: 'Import finished',
  fr: 'Importation terminée',
};

const errorStatus: StaticTranslationString = {
  de: 'Abfrage fehlgeschlagen',
  en: 'Import failed',
  fr: "L'importation a échoué",
};

const genericError: StaticTranslationString = {
  de: 'Verbindung zur Cevi.DB API fehlgeschlagen.',
  en: 'Could not connect to the Cevi.DB API.',
  fr: "Échec de la connexion à l'API Cevi.DB.",
};

const foundEventsHeading: StaticTranslationString = {
  de: 'Gefundene Anlässe',
  en: 'Events found',
  fr: 'Événements trouvés',
};

const noEventsYet: StaticTranslationString = {
  de: 'Noch keine Anlässe gefunden.',
  en: 'No events found yet.',
  fr: 'Aucun événement trouvé pour le moment.',
};

const reloadButtonLabel: StaticTranslationString = {
  de: 'Seite neu laden',
  en: 'Reload page',
  fr: 'Recharger la page',
};

const listRefreshFailed: StaticTranslationString = {
  de: 'Die Liste unten konnte nicht automatisch aktualisiert werden — bitte die Seite neu laden.',
  en: 'The list below could not be refreshed automatically — please reload the page.',
  fr: "La liste ci-dessous n'a pas pu être actualisée automatiquement — veuillez recharger la page.",
};

const groupLabel: StaticTranslationString = {
  de: 'Gruppe',
  en: 'Group',
  fr: 'Groupe',
};

const progressSummary = (locale: Locale, processed: number, total: number): string => {
  const counts = `${String(processed)}/${String(total)}`;
  if (locale === 'en') return `${counts} subgroups`;
  if (locale === 'fr') return `${counts} sous-groupes`;
  return `${counts} Untergruppen`;
};

const resultSummary = (locale: Locale, newCount: number, totalFound: number): string => {
  if (locale === 'en')
    return `${String(newCount)} new event(s) saved — ${String(totalFound)} matched in total.`;
  if (locale === 'fr')
    return `${String(newCount)} nouvel(x) événement(s) enregistré(s) — ${String(totalFound)} au total.`;
  return `${String(newCount)} neue Anlässe gespeichert — insgesamt ${String(totalFound)} gefunden.`;
};

/**
 * A run over zero subgroups is still a finished run, so `done` fills the bar rather than
 * leaving it at an unexplained 0%.
 */
const computePercentage = (state: PopulateSubeventsState): number => {
  if (state.totalGroups > 0) return Math.round((state.processedGroups / state.totalGroups) * 100);
  return state.phase === 'done' ? 100 : 0;
};

/**
 * Rendered above the list of the Höfe: a button that walks all subgroups of group 4337 on
 * the Cevi.DB API and adds the events it finds to their Höfe.
 *
 * The import streams its progress, so the panel shows a progress bar over the walked
 * subgroups and the names of the events as they are discovered. Only shown to those who may
 * write the Höfe; the endpoint refuses everybody else anyway.
 */
export const PopulateSubeventsButton: React.FC = () => {
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const { permissions } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [didRefreshList, setDidRefreshList] = useState(true);

  const { query, refineListData } = useListQuery();

  /**
   * Reloads the rows of the list below. They were written server-side, but the table renders
   * from the list query provider, which would otherwise keep showing the Höfe as they were
   * until a full page reload.
   */
  const refreshList = useCallback(async (): Promise<void> => {
    try {
      await refineListData(query);
      setDidRefreshList(true);
    } catch {
      setDidRefreshList(false);
    }
  }, [query, refineListData]);

  const { state, isRunning, start } = usePopulateSubevents(refreshList);

  const handleConfirm = async (): Promise<void> => {
    setIsModalOpen(false);
    setDidRefreshList(true);
    await start();
  };

  // Update, not create: a Hof is read-only in the admin panel and only the sync creates one,
  // while the billing team, who may run it, still updates the reminder override.
  if (permissions?.collections?.['hoefe']?.update !== true) return <></>;

  const percentage = computePercentage(state);

  const statusText = {
    idle: '',
    walking: walkingStatus[locale],
    saving: savingStatus[locale],
    done: doneStatus[locale],
    error: errorStatus[locale],
  }[state.phase];

  return (
    <div className="mb-5 rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-50) p-4">
      <h4 className="m-0 mb-2 text-[15px] font-semibold text-(--theme-elevation-900)">
        {cardTitle[locale]}
      </h4>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-(--theme-elevation-600)">
        {cardDescriptionBefore[locale]}
        <a
          href="https://db.cevi.ch/groups/4337/events/simple?returning=true&year=2027"
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--theme-success-600) underline"
        >
          {parentGroupLinkLabel[locale]}
        </a>
        {cardDescriptionAfter[locale]}
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
        onClick={() => setIsModalOpen(true)}
      >
        {isRunning ? runningButtonLabel[locale] : startButtonLabel[locale]}
      </Button>

      {state.phase !== 'idle' && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SyncProgressCard
            phase={syncPhaseOf(isRunning, state.phase === 'error')}
            status={statusText}
            percentage={percentage}
            summary={progressSummary(locale, state.processedGroups, state.totalGroups)}
            ariaLabel={cardTitle[locale]}
            error={state.phase === 'error' ? (state.error ?? genericError[locale]) : undefined}
          >
            {state.phase === 'done' && (
              <>
                <p className="mt-3 mb-0 text-[13px] text-(--theme-elevation-700)">
                  {resultSummary(locale, state.newEventIds.size, state.foundEvents.length)}
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
            heading={foundEventsHeading[locale]}
            emptyText={noEventsYet[locale]}
            items={state.foundEvents.map((event) => ({
              key: event.eventId,
              label: event.eventName,
              meta: `${groupLabel[locale]} ${event.groupId}`,
              isNew: state.newEventIds.has(event.eventId),
            }))}
            locale={locale}
          />
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        message={confirmModalMessage[locale]}
        title={confirmModalTitle[locale]}
        confirmLabel={confirmModalConfirmLabel[locale]}
        submittingText={runningButtonLabel[locale]}
        isSubmitting={isRunning}
        locale={locale}
      />
    </div>
  );
};

export default PopulateSubeventsButton;
