'use client';

import { useConfig, useDocumentInfo, useLocale } from '@payloadcms/ui';
import {
  Close as DialogClose,
  Content as DialogContent,
  Overlay as DialogOverlay,
  Portal as DialogPortal,
  Root as DialogRoot,
  Title as DialogTitle,
  Trigger as DialogTrigger,
} from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
];

const AutoTranslate: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { code: targetLanguage } = useLocale();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const { config } = useConfig();
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
      const response = await fetch(`${config.serverURL || ''}${config.routes.api}/auto-translate`, {
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
        throw new Error(errorData.error || 'Failed to auto-translate content');
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

  const currentLocaleName = LOCALES.find((l) => l.code === targetLanguage)?.label || targetLanguage;
  const availableSources = LOCALES.filter((l) => l.code !== targetLanguage);

  return (
    <DialogRoot open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '13px',
            borderRadius: '4px',
            border: '1px solid var(--theme-elevation-200)',
            background: 'var(--theme-elevation-100)',
            color: 'var(--theme-text)',
            height: '32px',
          }}
          title={`Inhalt automatisch nach ${currentLocaleName} übersetzen`}
        >
          <span style={{ fontSize: '1.1em' }}>🌐</span>
          <span>Auto-translate</span>
        </button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
          }}
        />
        <DialogContent
          style={{
            backgroundColor: 'var(--theme-elevation-50)',
            padding: '2rem',
            borderRadius: '8px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10_000,
            minWidth: '400px',
            maxWidth: '500px',
            color: 'var(--theme-text)',
            border: '1px solid var(--theme-elevation-150)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          <DialogTitle style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600 }}>
            Automatische Übersetzung
          </DialogTitle>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
              Wähle die Sprache aus, von der der Inhalt nach <strong>{currentLocaleName}</strong>{' '}
              übersetzt werden soll.
              <br />
              <br />
              <strong>Warnung:</strong> Die bestehenden Inhalte in {currentLocaleName} werden
              überschrieben!
            </p>

            <label
              htmlFor="source-lang-select"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
            >
              Quellsprache
            </label>
            <select
              id="source-lang-select"
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: '4px',
                backgroundColor: 'var(--theme-elevation-100)',
                color: 'var(--theme-text)',
              }}
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

          {error && (
            <div style={{ color: 'red', marginTop: '1rem', fontSize: '0.9rem' }}>
              Fehler: {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              marginTop: '1.5rem',
            }}
          >
            <DialogClose asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="btn btn--style-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: '4px',
                  background: 'transparent',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  color: 'var(--theme-text)',
                }}
              >
                Abbrechen
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={() => void handleTranslate()}
              disabled={sourceLanguage.length === 0 || isSubmitting}
              className="btn btn--style-primary"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: sourceLanguage.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
                opacity: sourceLanguage.length > 0 && !isSubmitting ? 1 : 0.5,
                border: 'none',
                backgroundColor: '#16a34a',
                color: 'white',
              }}
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
