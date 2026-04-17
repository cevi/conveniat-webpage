'use client';

import { documentControlButtonClasses } from '@/features/payload-cms/payload-cms/components/shared/document-control-button-styles';
import { cn } from '@/utils/tailwindcss-override';
import { Button, useConfig, useDocumentInfo, useLocale, useTranslation } from '@payloadcms/ui';
import {
  Close as DialogClose,
  Content as DialogContent,
  Overlay as DialogOverlay,
  Portal as DialogPortal,
  Root as DialogRoot,
  Title as DialogTitle,
} from '@radix-ui/react-dialog';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
];

const autoTranslateActionString: Record<string, string> = {
  en: 'Auto-translate',
  de: 'Übersetzen lassen',
  fr: 'Traduction auto',
};

const AutoTranslate: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { code: targetLanguage } = useLocale();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const { config } = useConfig();
  const { i18n } = useTranslation();
  const router = useRouter();

  // If this isn't a saved document yet (or is a global), we might not be able to auto-translate safely
  if (!id || globalSlug) {
    return;
  }

  const handleTranslate = async (): Promise<void> => {
    if (!sourceLanguage) return;

    setIsSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/auto-translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: collectionSlug,
          id,
          sourceLocale: sourceLanguage,
          targetLocale: targetLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? 'Failed to auto-translate content');
      }

      setModalOpen(false);
      // Wait a moment and refresh to show translated content
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error_) {
      if (error_ instanceof Error) {
        setError(error_.message);
      } else {
        setError(String(error_));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLocaleName = LOCALES.find((l) => l.code === targetLanguage)?.label ?? targetLanguage;
  const availableSources = LOCALES.filter((l) => l.code !== targetLanguage);

  return (
    <DialogRoot open={modalOpen} onOpenChange={setModalOpen}>
      <span title={`Inhalt automatisch nach ${currentLocaleName} übersetzen`}>
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.neutral()}
          size="medium"
          onClick={(event) => {
            event.preventDefault();
            setModalOpen(true);
          }}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span className="truncate">
            {autoTranslateActionString[i18n.language] ?? autoTranslateActionString['en']}
          </span>
        </Button>
      </span>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-9999 bg-black/50" />
        <DialogContent className="fixed top-1/2 left-1/2 z-10000 max-w-[500px] min-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-(--theme-elevation-150) bg-(--theme-elevation-50) p-8 text-(--theme-text) shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <DialogTitle className="mb-4 text-xl font-semibold">Automatische Übersetzung</DialogTitle>

          <div className="mb-4">
            <p className="mb-4 text-sm">
              Wähle die Sprache aus, von der der Inhalt nach <strong>{currentLocaleName}</strong>{' '}
              übersetzt werden soll.
              <br />
              <br />
              <strong>Warnung:</strong> Die bestehenden Inhalte in {currentLocaleName} werden
              überschrieben!
            </p>

            <label htmlFor="source-lang-select" className="mb-2 block font-medium">
              Quellsprache
            </label>
            <select
              id="source-lang-select"
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              className="w-full rounded border border-(--theme-elevation-150) bg-(--theme-elevation-100) p-2 text-(--theme-text) disabled:opacity-50"
              disabled={isSubmitting}
            >
              <option value="">-- Bitte wählen --</option>
              {availableSources.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {error && <div className="mt-4 text-sm text-red-500">Fehler: {error}</div>}

          <div className="mt-6 flex justify-end gap-4">
            <DialogClose asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="btn btn--style-secondary h-auto cursor-pointer rounded border border-(--theme-elevation-150) bg-transparent px-4 py-2 text-(--theme-text) disabled:cursor-not-allowed"
              >
                Abbrechen
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={() => void handleTranslate()}
              disabled={sourceLanguage.length === 0 || isSubmitting}
              className={cn(
                'btn btn--style-primary h-auto rounded border-none bg-[#16a34a] px-4 py-2 text-white',
                (sourceLanguage.length === 0 || isSubmitting) && 'cursor-not-allowed opacity-50',
              )}
            >
              {isSubmitting ? 'Übersetze...' : 'Übersetzen'}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
};

export default AutoTranslate;
