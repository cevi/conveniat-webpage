'use client';

import { Button } from '@/components/ui/buttons/button';
import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useOfflineDownload } from '@/hooks/use-offline-download';
import type { Locale, StaticTranslationString } from '@/types/types';
import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import React from 'react';

const offlineSettingsTitle: StaticTranslationString = {
  en: 'Offline Mode',
  de: 'Offline-Modus',
  fr: 'Mode hors ligne',
};

const updateButton: StaticTranslationString = {
  en: 'Update',
  de: 'Aktualisieren',
  fr: 'Mettre à jour',
};

const downloadedText: StaticTranslationString = {
  en: 'Downloaded',
  de: 'Heruntergeladen',
  fr: 'Téléchargé',
};

const notDownloadedText: StaticTranslationString = {
  en: 'Not downloaded',
  de: 'Nicht heruntergeladen',
  fr: 'Non téléchargé',
};

const downloadingText: StaticTranslationString = {
  en: 'Downloading...',
  de: 'Lädt...',
  fr: 'Téléchargement...',
};

const offlineUnavailableText: StaticTranslationString = {
  en: 'Not supported',
  de: 'Nicht unterstützt',
  fr: 'Non supporté',
};

interface OfflineContentSettingsProperties {
  locale: Locale;
}

export const OfflineContentSettings: React.FC<OfflineContentSettingsProperties> = ({ locale }) => {
  const { status, progress, startDownload, deleteContent } = useOfflineDownload({
    checkCacheOnMount: true,
  });

  const displayStatus = status === 'success' ? 'has-content' : status;

  return (
    <SettingsRow
      icon={Download}
      title={offlineSettingsTitle[locale]}
      subtitle={
        displayStatus === 'has-content' ? downloadedText[locale] : notDownloadedText[locale]
      }
      error={displayStatus === 'sw-error' ? offlineUnavailableText[locale] : undefined}
      action={
        <>
          {displayStatus === 'has-content' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                void startDownload();
              }}
              title={updateButton[locale]}
              className="h-8 w-8 text-gray-400 hover:text-blue-600"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Switch
            checked={displayStatus === 'has-content' || displayStatus === 'downloading'}
            onCheckedChange={(checked) => {
              if (checked) {
                void startDownload();
              } else {
                void deleteContent();
              }
            }}
            disabled={displayStatus === 'downloading' || displayStatus === 'sw-error'}
            loading={displayStatus === 'downloading'}
          />
        </>
      }
    >
      {displayStatus === 'downloading' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium text-blue-600">
            <span>{downloadingText[locale]}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
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
    </SettingsRow>
  );
};
