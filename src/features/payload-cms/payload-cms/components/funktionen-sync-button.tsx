'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { Button, toast, useLocale } from '@payloadcms/ui';
import type React from 'react';
import { useState } from 'react';

const description: StaticTranslationString = {
  de: 'Die Funktionen werden jede Nacht aus den Leitungen der Cevi.DB-Gruppen abgeglichen. Nach einer Änderung in der Cevi.DB lässt sich der Abgleich hier sofort starten; er läuft im Hintergrund und dauert je nach Anzahl Gruppen ein bis zwei Minuten.',
  en: 'The functions are synced every night from the leaders of the Cevi.DB groups. After a change in Cevi.DB, start the sync here right away; it runs in the background and takes a minute or two, depending on the number of groups.',
  fr: "Les fonctions sont synchronisées chaque nuit à partir des responsables des groupes Cevi.DB. Après une modification dans Cevi.DB, lancez la synchronisation ici ; elle s'exécute en arrière-plan et prend une à deux minutes selon le nombre de groupes.",
};

const buttonLabel: StaticTranslationString = {
  de: 'Jetzt aus Cevi.DB abgleichen',
  en: 'Sync from Cevi.DB now',
  fr: 'Synchroniser depuis Cevi.DB',
};

const queuedMessage: StaticTranslationString = {
  de: 'Abgleich gestartet. Laden Sie die Liste in ein bis zwei Minuten neu.',
  en: 'Sync started. Reload the list in a minute or two.',
  fr: 'Synchronisation lancée. Rechargez la liste dans une à deux minutes.',
};

const alreadyRunningMessage: StaticTranslationString = {
  de: 'Ein Abgleich ist bereits gestartet. Laden Sie die Liste in ein bis zwei Minuten neu.',
  en: 'A sync is already running. Reload the list in a minute or two.',
  fr: 'Une synchronisation est déjà en cours. Rechargez la liste dans une à deux minutes.',
};

const failedMessage: StaticTranslationString = {
  de: 'Der Abgleich konnte nicht gestartet werden.',
  en: 'The sync could not be started.',
  fr: "La synchronisation n'a pas pu être lancée.",
};

/** Starts the Cevi.DB sync of the functions without waiting for the night. */
export const FunktionenSyncButton: React.FC = () => {
  const locale = resolveAdminLocale(useLocale().code);
  const [isQueuing, setIsQueuing] = useState(false);

  const queueSync = async (): Promise<void> => {
    setIsQueuing(true);
    try {
      const response = await fetch('/api/funktionen/sync', { method: 'POST' });
      if (response.status === 202) toast.success(queuedMessage[locale]);
      else if (response.ok) toast.info(alreadyRunningMessage[locale]);
      else toast.error(failedMessage[locale]);
    } catch {
      toast.error(failedMessage[locale]);
    } finally {
      setIsQueuing(false);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <p className="m-0 max-w-3xl text-sm text-(--theme-elevation-500)">{description[locale]}</p>
      <Button
        buttonStyle="secondary"
        size="small"
        margin={false}
        disabled={isQueuing}
        onClick={(): void => void queueSync()}
      >
        {buttonLabel[locale]}
      </Button>
    </div>
  );
};
