'use client';

import { Button } from '@/components/ui/buttons/button';
import { useOfflineDownload } from '@/hooks/use-offline-download';
import type { Locale, StaticTranslationString } from '@/types/types';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import React from 'react';

const offlineSettingsTitle: StaticTranslationString = {
  en: 'Offline Content',
  de: 'Offline Inhalte',
  fr: 'Contenu hors ligne',
};

const offlineSettingsDescription: StaticTranslationString = {
  en: 'Manage your offline content. You can download all pages and maps for offline use, or update them if new content is available.',
  de: 'Verwalten Sie Ihre Offline-Inhalte. Sie können alle Seiten und Karten für die Offline-Nutzung herunterladen oder aktualisieren, wenn neue Inhalte verfügbar sind.',
  fr: 'Gérez votre contenu hors ligne. Vous pouvez télécharger toutes les pages et cartes pour une utilisation hors ligne, ou les mettre à jour si du nouveau contenu est disponible.',
};

const downloadButton: StaticTranslationString = {
  en: 'Download All Content',
  de: 'Alle Inhalte herunterladen',
  fr: 'Télécharger tout le contenu',
};

const updateButton: StaticTranslationString = {
  en: 'Update Content',
  de: 'Inhalte aktualisieren',
  fr: 'Mettre à jour le contenu',
};

const deleteButton: StaticTranslationString = {
  en: 'Delete Offline Content',
  de: 'Offline-Inhalte löschen',
  fr: 'Supprimer le contenu hors ligne',
};

const statusDownloaded: StaticTranslationString = {
  en: 'Content Downloaded',
  de: 'Inhalt heruntergeladen',
  fr: 'Contenu téléchargé',
};

const statusNotDownloaded: StaticTranslationString = {
  en: 'Not Downloaded',
  de: 'Nicht heruntergeladen',
  fr: 'Nicht heruntergeladen',
};

const downloadingText: StaticTranslationString = {
  en: 'Downloading...',
  de: 'Wird heruntergeladen...',
  fr: 'Téléchargement...',
};

const offlineUnavailableText: StaticTranslationString = {
  en: 'Offline mode is currently unavailable.',
  de: 'Der Offline-Modus ist derzeit nicht verfügbar.',
  fr: 'Le mode hors ligne est actuellement indisponible.',
};

interface OfflineContentSettingsProperties {
  locale: Locale;
}

export const OfflineContentSettings: React.FC<OfflineContentSettingsProperties> = ({ locale }) => {
  const { status, progress, startDownload, deleteContent } = useOfflineDownload({
    checkCacheOnMount: true,
  });

  // Map success to has-content for settings context
  const displayStatus = status === 'success' ? 'has-content' : status;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50/50 text-blue-600">
          {displayStatus === 'has-content' ? (
            <Download className="h-6 w-6" />
          ) : (
            <WifiOff className="h-6 w-6" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{offlineSettingsTitle[locale]}</h3>
          <p className="text-sm text-gray-500">{offlineSettingsDescription[locale]}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Status:{' '}
            <span
              className={
                displayStatus === 'has-content' ? 'font-semibold text-green-600' : 'text-gray-500'
              }
            >
              {displayStatus === 'has-content'
                ? statusDownloaded[locale]
                : statusNotDownloaded[locale]}
            </span>
          </span>
        </div>

        {displayStatus === 'downloading' && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-xs font-medium text-blue-600">
              <span>{downloadingText[locale]}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-blue-50">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {displayStatus === 'sw-error' && (
          <div className="mb-4 rounded-lg bg-gray-100 p-3 text-gray-600">
            <span className="font-semibold">{offlineUnavailableText[locale]}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {((): React.ReactNode => {
            if (displayStatus === 'sw-error') {
              return (
                <Button
                  disabled
                  variant="outline"
                  className="border-gray-200 bg-gray-100 text-gray-400"
                >
                  <WifiOff className="mr-2 h-4 w-4" />
                  {downloadButton[locale]}
                </Button>
              );
            }

            if (displayStatus === 'idle' || displayStatus === 'has-content') {
              return (
                <Button
                  onClick={startDownload}
                  disabled={false}
                  className={`bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 ${displayStatus === 'has-content' ? 'bg-blue-600' : ''}`}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {displayStatus === 'has-content' ? updateButton[locale] : downloadButton[locale]}
                </Button>
              );
            }

            return (
              <Button
                onClick={startDownload}
                disabled
                variant="outline"
                className="border-gray-100 bg-gray-50 text-gray-400"
              >
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {updateButton[locale]}
              </Button>
            );
          })()}

          {displayStatus === 'has-content' && (
            <Button
              onClick={() => {
                void deleteContent();
              }}
              variant="ghost"
              size="icon"
              className="text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title={deleteButton[locale]}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
