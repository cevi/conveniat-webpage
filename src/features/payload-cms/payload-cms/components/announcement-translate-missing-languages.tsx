'use client';

import type { AnnouncementTranslation } from '@/features/payload-cms/payload-cms/endpoints/translate-announcement';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import { getLexicalText } from '@/features/payload-cms/payload-cms/utils/lexical-to-markdown';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Button, useConfig, useForm, useTranslation } from '@payloadcms/ui';
import { Languages } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const buttonLabel: StaticTranslationString = {
  en: 'Translate empty languages from German',
  de: 'Leere Sprachen aus Deutsch übersetzen',
  fr: "Traduire les langues vides depuis l'allemand",
};
const translatingLabel: StaticTranslationString = {
  en: 'Translating…',
  de: 'Übersetze…',
  fr: 'Traduction…',
};
const hint: StaticTranslationString = {
  en: 'Fills in only what is still empty. Check the translation before you publish.',
  de: 'Füllt nur aus, was noch leer ist. Prüfe die Übersetzung vor dem Veröffentlichen.',
  fr: 'Ne remplit que ce qui est encore vide. Vérifie la traduction avant de publier.',
};
const germanMissing: StaticTranslationString = {
  en: 'Write the German title and text first.',
  de: 'Schreibe zuerst den deutschen Titel und Text.',
  fr: "Écris d'abord le titre et le texte en allemand.",
};
const nothingToTranslate: StaticTranslationString = {
  en: 'Every language is already filled in.',
  de: 'Alle Sprachen sind bereits ausgefüllt.',
  fr: 'Toutes les langues sont déjà remplies.',
};
const translationFailed: StaticTranslationString = {
  en: 'The translation failed:',
  de: 'Die Übersetzung ist fehlgeschlagen:',
  fr: 'La traduction a échoué :',
};

type Feedback = { kind: 'info' | 'error'; message: string } | undefined;

/**
 * Fills the French and English fields of an announcement that are still empty with a
 * machine translation of the German ones. Only the form changes; the editor reviews the
 * result and publishes as usual.
 */
export const AnnouncementTranslateMissingLanguages: React.FC<{ targetLocales: string[] }> = ({
  targetLocales,
}) => {
  const { getDataByPath, dispatchFields, setModified } = useForm();
  const { config } = useConfig();
  const { i18n } = useTranslation();
  const locale = getAdminLocale(i18n);
  const [isTranslating, setIsTranslating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();

  if (targetLocales.length === 0) return <></>;

  const translate = async (): Promise<void> => {
    setFeedback(undefined);

    const germanTitle = (getDataByPath<string | undefined>('title.de') ?? '').trim();
    const germanContent = getDataByPath('content.de');
    if (germanTitle === '' && getLexicalText(germanContent) === '') {
      setFeedback({ kind: 'info', message: germanMissing[locale] });
      return;
    }

    const isTitleEmpty = (code: string): boolean =>
      (getDataByPath<string | undefined>(`title.${code}`) ?? '').trim() === '';
    const isContentEmpty = (code: string): boolean =>
      getLexicalText(getDataByPath(`content.${code}`)) === '';
    const emptyLocales = targetLocales.filter((code) => isTitleEmpty(code) || isContentEmpty(code));
    if (emptyLocales.length === 0) {
      setFeedback({ kind: 'info', message: nothingToTranslate[locale] });
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch(
        `${config.serverURL}${config.routes.api}/announcements/translate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: germanTitle,
            content: germanContent,
            targetLocales: emptyLocales,
          }),
        },
      );
      const result = (await response.json()) as {
        translations?: Record<string, AnnouncementTranslation>;
        error?: string;
      };
      if (!response.ok || result.translations === undefined) {
        throw new Error(result.error ?? String(response.status));
      }

      for (const [code, translation] of Object.entries(result.translations)) {
        if (isTitleEmpty(code)) {
          dispatchFields({ type: 'UPDATE', path: `title.${code}`, value: translation.title });
        }
        if (isContentEmpty(code)) {
          // The rich text editor only picks up a value from outside when its initial
          // value changes as well, so both are set.
          dispatchFields({
            type: 'UPDATE',
            path: `content.${code}`,
            value: translation.content,
            initialValue: translation.content,
          });
        }
      }
      setModified(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFeedback({ kind: 'error', message: `${translationFailed[locale]} ${message}` });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="field-type mb-6 flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Button
          buttonStyle="secondary"
          size="medium"
          margin={false}
          disabled={isTranslating}
          onClick={() => void translate()}
        >
          <span className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {isTranslating ? translatingLabel[locale] : buttonLabel[locale]}
          </span>
        </Button>
      </div>
      <p className="m-0 text-xs text-(--theme-elevation-500)">{hint[locale]}</p>
      {feedback !== undefined && (
        <p
          className={cn(
            'm-0 text-sm',
            feedback.kind === 'error' ? 'text-(--theme-error-500)' : 'text-(--theme-elevation-800)',
          )}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
};
