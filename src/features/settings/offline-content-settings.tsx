'use client';

import { Button } from '@/components/ui/buttons/button';
// eslint-disable-next-line import/no-restricted-paths
import { CACHE_NAMES } from '@/features/service-worker/constants';
import type { Locale, StaticTranslationString } from '@/types/types';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
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

interface OfflineContentSettingsProperties {
  locale: Locale;
}

export const OfflineContentSettings: React.FC<OfflineContentSettingsProperties> = ({ locale }) => {
  const [status, setStatus] = React.useState<'idle' | 'downloading' | 'has-content'>('idle');
  const [progress, setProgress] = React.useState({ total: 0, current: 0 });

  // Check if content is already cached on mount
  React.useEffect(() => {
    const checkCache = async (): Promise<void> => {
      // Simple check: see if pages cache has entries
      const pagesCache = await caches.open(CACHE_NAMES.PAGES);
      const keys = await pagesCache.keys();
      // We can be smarter here, checking for specific offline page keys
      if (keys.length > 5) {
        // Arbitrary threshold to assume "downloaded"
        setStatus('has-content');
      }
    };
    void checkCache();
  }, []);

  React.useEffect(() => {
    if (status === 'downloading') {
      const handleMessage = (event: MessageEvent): void => {
        const data = event.data as
          | {
              type: typeof ServiceWorkerMessages.OFFLINE_DOWNLOAD_PROGRESS;
              payload: { total: number; current: number };
            }
          | { type: typeof ServiceWorkerMessages.OFFLINE_DOWNLOAD_COMPLETE }
          | undefined;

        if (data?.type === ServiceWorkerMessages.OFFLINE_DOWNLOAD_PROGRESS) {
          setProgress(data.payload);
        } else if (data?.type === ServiceWorkerMessages.OFFLINE_DOWNLOAD_COMPLETE) {
          setStatus('has-content');
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return (): void => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
    return;
  }, [status]);

  const handleDownload = (): void => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setStatus('downloading');
      navigator.serviceWorker.controller.postMessage({
        type: ServiceWorkerMessages.START_OFFLINE_DOWNLOAD,
      });
    } else {
      console.warn('Service Worker not active. Cannot download.');
    }
  };

  const handleDelete = async (): Promise<void> => {
    // Manual delete of caches using correct versioned names
    const cacheNamesToDelete = [
      CACHE_NAMES.PAGES,
      CACHE_NAMES.MAP_TILES,
      CACHE_NAMES.OFFLINE_ASSETS,
      CACHE_NAMES.RSC,
    ];
    for (const name of cacheNamesToDelete) {
      await caches.delete(name);
    }
    setStatus('idle');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50/50 text-blue-600">
          {status === 'has-content' ? (
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
                status === 'has-content' ? 'font-semibold text-green-600' : 'text-gray-500'
              }
            >
              {status === 'has-content' ? statusDownloaded[locale] : statusNotDownloaded[locale]}
            </span>
          </span>
        </div>

        {status === 'downloading' && (
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

        <div className="flex flex-wrap items-center gap-3">
          {status === 'idle' || status === 'has-content' ? (
            <Button
              onClick={handleDownload}
              disabled={false}
              className={`bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 ${status === 'has-content' ? 'bg-blue-600' : ''}`}
            >
              <Download className="mr-2 h-4 w-4" />
              {status === 'has-content' ? updateButton[locale] : downloadButton[locale]}
            </Button>
          ) : (
            <Button
              onClick={handleDownload}
              disabled
              variant="outline"
              className="border-gray-100 bg-gray-50 text-gray-400"
            >
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {updateButton[locale]}
            </Button>
          )}

          {status === 'has-content' && (
            <Button
              onClick={() => {
                void handleDelete();
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
