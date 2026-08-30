'use client';

import type { PopulateSubeventsState } from '@/features/billing/hooks/use-populate-subevents';
import { usePopulateSubevents } from '@/features/billing/hooks/use-populate-subevents';
import type { PopulatedSubevent } from '@/features/billing/types';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { useDocumentInfo, useForm, useLocale, useServerFunctions } from '@payloadcms/ui';
import { AlertTriangle, CheckCircle2, Download, RefreshCw, Sparkles } from 'lucide-react';
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
  de: ' abzufragen. Es werden alle Anlässe mit dem Namen «Hauptlager conveniat27» oder «conveniat27» ermittelt und die Liste unten automatisch aktualisiert. Dieser Vorgang dauert ca. 45 Sekunden.',
  en: '. All events named “Hauptlager conveniat27” or “conveniat27” are collected and the list below is updated automatically. This takes about 45 seconds.',
  fr: '. Tous les événements nommés « Hauptlager conveniat27 » ou « conveniat27 » sont collectés et la liste ci-dessous est mise à jour automatiquement. Cette opération dure environ 45 secondes.',
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

const newBadge: StaticTranslationString = {
  de: 'neu',
  en: 'new',
  fr: 'nouveau',
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
 * Custom Payload CMS field component that renders a button to dynamically sync/populate
 * all subevents of group 4337 directly from the Cevi.DB API.
 *
 * The import streams its progress, so the panel shows a progress bar over the walked
 * subgroups and the names of the events as they are discovered.
 */
export const PopulateSubeventsButton: React.FC = () => {
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [didRefreshForm, setDidRefreshForm] = useState(true);

  const { getFormState } = useServerFunctions();
  const { getData, replaceState } = useForm();
  const { docPermissions, getDocPreferences, globalSlug } = useDocumentInfo();

  /**
   * Rebuilds the document's form state around the freshly stored event list. The rows
   * were written server-side, but the array field below renders from client form state,
   * which would otherwise keep showing yesterday's list until a full page reload.
   */
  const applyEventsToForm = useCallback(
    async (allEvents: PopulatedSubevent[]): Promise<void> => {
      if (globalSlug === undefined) {
        setDidRefreshForm(false);
        return;
      }

      try {
        const documentPreferences = await getDocPreferences();
        const result = await getFormState({
          data: { ...getData(), events: allEvents },
          docPermissions,
          docPreferences: documentPreferences,
          globalSlug,
          locale: code,
          operation: 'update',
          renderAllFields: true,
          schemaPath: globalSlug,
        });

        if (result.state === undefined) {
          setDidRefreshForm(false);
          return;
        }

        replaceState(result.state);
        setDidRefreshForm(true);
      } catch {
        setDidRefreshForm(false);
      }
    },
    [code, docPermissions, getData, getDocPreferences, getFormState, globalSlug, replaceState],
  );

  const { state, isRunning, start } = usePopulateSubevents(applyEventsToForm);

  const handleConfirm = async (): Promise<void> => {
    setIsModalOpen(false);
    setDidRefreshForm(true);
    await start();
  };

  const percentage = computePercentage(state);

  const statusText = {
    idle: '',
    walking: walkingStatus[locale],
    saving: savingStatus[locale],
    done: doneStatus[locale],
    error: errorStatus[locale],
  }[state.phase];

  // Newest first: while the walk runs the freshly discovered event stays visible
  // without the list having to scroll itself.
  const eventsNewestFirst = [...state.foundEvents].reverse();

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

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isRunning}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-(--theme-success-500) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--theme-success-600) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isRunning ? runningButtonLabel[locale] : startButtonLabel[locale]}
      </button>

      {state.phase !== 'idle' && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-0) p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-(--theme-elevation-800)">
              {state.phase === 'done' && (
                <CheckCircle2 className="h-4 w-4 text-(--theme-success-500)" />
              )}
              {state.phase === 'error' && (
                <AlertTriangle className="h-4 w-4 text-(--theme-error-500)" />
              )}
              {isRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
              <span>{statusText}</span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-(--theme-elevation-100)"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
              aria-label={cardTitle[locale]}
            >
              <div
                className={
                  state.phase === 'error'
                    ? 'h-full rounded-full bg-(--theme-error-500) transition-[width] duration-300 ease-out'
                    : 'h-full rounded-full bg-(--theme-success-500) transition-[width] duration-300 ease-out'
                }
                style={{ width: `${String(percentage)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-(--theme-elevation-600)">
              <span>{progressSummary(locale, state.processedGroups, state.totalGroups)}</span>
              <span className="font-mono">{String(percentage)}%</span>
            </div>

            {state.phase === 'error' && (
              <p className="mt-3 mb-0 text-[13px] text-(--theme-error-600)">
                {state.error ?? genericError[locale]}
              </p>
            )}

            {state.phase === 'done' && (
              <>
                <p className="mt-3 mb-0 text-[13px] text-(--theme-elevation-700)">
                  {resultSummary(locale, state.newEventIds.size, state.foundEvents.length)}
                </p>
                {!didRefreshForm && (
                  <>
                    <p className="mt-2 mb-0 text-[13px] text-(--theme-error-600)">
                      {listRefreshFailed[locale]}
                    </p>
                    <button
                      type="button"
                      onClick={() => globalThis.location.reload()}
                      className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-50) px-3 py-1.5 text-xs font-medium text-(--theme-elevation-800) hover:bg-(--theme-elevation-100)"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {reloadButtonLabel[locale]}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-0) p-4">
            <div className="mb-2 flex items-baseline justify-between text-sm font-medium text-(--theme-elevation-800)">
              <span>{foundEventsHeading[locale]}</span>
              <span className="font-mono text-xs text-(--theme-elevation-600)">
                {String(state.foundEvents.length)}
              </span>
            </div>

            {state.foundEvents.length === 0 ? (
              <p className="m-0 text-[13px] text-(--theme-elevation-500)">{noEventsYet[locale]}</p>
            ) : (
              <ul className="m-0 max-h-56 list-none overflow-y-auto p-0">
                {eventsNewestFirst.map((event) => (
                  <li
                    key={event.eventId}
                    className="flex items-center justify-between gap-2 border-b border-(--theme-elevation-100) py-1.5 last:border-b-0"
                  >
                    <span
                      className="truncate text-[13px] text-(--theme-elevation-800)"
                      title={event.eventName}
                    >
                      {event.eventName}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {state.newEventIds.has(event.eventId) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-(--theme-success-100) px-2 py-0.5 text-[11px] font-medium text-(--theme-success-600)">
                          <Sparkles className="h-3 w-3" />
                          {newBadge[locale]}
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-(--theme-elevation-500)">
                        {groupLabel[locale]} {event.groupId}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
