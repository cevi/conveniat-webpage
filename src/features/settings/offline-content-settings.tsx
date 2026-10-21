'use client';

import { Button } from '@/components/ui/buttons/button';
import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useOfflineDownload } from '@/hooks/use-offline-download';
import { syncAllOfflineData } from '@/lib/chat-sync';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
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
  const trpcUtils = trpc.useUtils();
  const { status, progress, startDownload, deleteContent } = useOfflineDownload({
    checkCacheOnMount: true,
    dataSyncFn: () => syncAllOfflineData(trpcUtils),
  });

  const displayStatus = status === 'success' ? 'has-content' : status;

  return (
    <SettingsRow
      title={offlineSettingsTitle[locale]}
      subtitle={
        displayStatus === 'has-content' ? downloadedText[locale] : notDownloadedText[locale]
      }
      error={displayStatus === 'sw-error' ? offlineUnavailableText[locale] : undefined}
      action={
        <>
          {displayStatus === 'has-content' && (
            <Button
              variant="quiet"
              size="touchIcon"
              onClick={() => {
                startDownload();
              }}
              title={updateButton[locale]}
              aria-label={updateButton[locale]}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          )}
          <Switch
            aria-label={offlineSettingsTitle[locale]}
            checked={displayStatus === 'has-content' || displayStatus === 'downloading'}
            onCheckedChange={(checked) => {
              if (checked) {
                startDownload();
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
          <div className="flex justify-between text-[13px] font-medium text-green-700 tabular-nums">
            <span>{downloadingText[locale]}</span>
            <span>
              {progress.total > 0
                ? Math.min(100, Math.round((progress.current / progress.total) * 100))
                : 0}
              %
            </span>
          </div>
          <div className="bg-quiet h-1.5 w-full overflow-hidden rounded-full">
            <motion.div
              className="bg-conveniat-green h-full"
              initial={{ width: 0 }}
              animate={{
                width: `${progress.total > 0 ? Math.min(100, (progress.current / progress.total) * 100) : 0}%`,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </SettingsRow>
  );
};
