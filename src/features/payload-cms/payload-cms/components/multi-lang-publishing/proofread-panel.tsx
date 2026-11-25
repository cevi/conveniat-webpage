'use client';

import { useProofread } from '@/features/payload-cms/payload-cms/hooks/use-proofread';
import type {
  ProofreadCategory,
  ProofreadFinding,
} from '@/features/payload-cms/payload-cms/utils/proofread';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { Button, Pill } from '@payloadcms/ui';
import { CircleCheck, Info, LoaderCircle, Sparkles } from 'lucide-react';
import type React from 'react';

const checkingString: StaticTranslationString = {
  de: 'KI prüft den Text …',
  fr: "L'IA vérifie le texte …",
  en: 'AI is checking the text …',
};

const checkingHintString: StaticTranslationString = {
  de: 'Dauert meist 15 bis 20 Sekunden.',
  fr: 'Prend généralement 15 à 20 secondes.',
  en: 'Usually takes 15 to 20 seconds.',
};

const skipString: StaticTranslationString = {
  de: 'KI-Prüfung überspringen',
  fr: 'Passer la vérification IA',
  en: 'Skip AI check',
};

const headingString: StaticTranslationString = {
  de: 'KI-Korrektur',
  fr: 'Correction IA',
  en: 'AI proofreading',
};

const oneFindingString: StaticTranslationString = {
  de: 'Hinweis',
  fr: 'remarque',
  en: 'suggestion',
};

const manyFindingsString: StaticTranslationString = {
  de: 'Hinweise',
  fr: 'remarques',
  en: 'suggestions',
};

const cleanString: StaticTranslationString = {
  de: 'Keine Tipp- oder Grammatikfehler gefunden.',
  fr: 'Aucune faute de frappe ni de grammaire trouvée.',
  en: 'No typos or grammar mistakes found.',
};

const cleanPartString: StaticTranslationString = {
  de: 'Im geprüften Teil keine Tipp- oder Grammatikfehler gefunden.',
  fr: 'Aucune faute de frappe ni de grammaire dans la partie vérifiée.',
  en: 'No typos or grammar mistakes in the checked part.',
};

const truncatedString: StaticTranslationString = {
  de: 'Der Text ist länger, als eine Prüfung liest: sein Ende wurde nicht geprüft.',
  fr: "Le texte est plus long qu'une vérification ne peut lire : sa fin n'a pas été vérifiée.",
  en: 'The text is longer than one check reads: its end was not checked.',
};

const allHandledString: StaticTranslationString = {
  de: 'Alle Hinweise erledigt.',
  fr: 'Toutes les remarques sont traitées.',
  en: 'All suggestions handled.',
};

const failedString: StaticTranslationString = {
  de: 'Die KI-Korrektur ist gerade nicht verfügbar. Sie können trotzdem veröffentlichen.',
  fr: "La correction IA n'est pas disponible pour le moment. Vous pouvez tout de même publier.",
  en: 'AI proofreading is unavailable right now. You can still publish.',
};

const footnoteString: StaticTranslationString = {
  de: 'Vorschläge von Gemini, bitte prüfen. Übernommene Änderungen werden mit veröffentlicht.',
  fr: 'Suggestions de Gemini, à vérifier. Les corrections appliquées sont publiées avec le document.',
  en: 'Suggestions by Gemini, please check them. Applied changes are published with the document.',
};

const applyString: StaticTranslationString = {
  de: 'Übernehmen',
  fr: 'Appliquer',
  en: 'Apply',
};

const dismissString: StaticTranslationString = {
  de: 'Ignorieren',
  fr: 'Ignorer',
  en: 'Dismiss',
};

const jumpString: StaticTranslationString = {
  de: 'Zum Feld',
  fr: 'Aller au champ',
  en: 'Go to field',
};

const categoryStrings: Record<ProofreadCategory, StaticTranslationString> = {
  spelling: { de: 'Rechtschreibung', fr: 'Orthographe', en: 'Spelling' },
  grammar: { de: 'Grammatik', fr: 'Grammaire', en: 'Grammar' },
  glossary: { de: 'Begriff', fr: 'Terme', en: 'Term' },
  style: { de: 'Stil', fr: 'Style', en: 'Style' },
};

/** Scrolls the field of a finding into view, once the dialog is gone. */
const scrollToField = (path: string): void => {
  requestAnimationFrame(() => {
    const field =
      document.querySelector<HTMLElement>(`#field-${CSS.escape(path.replaceAll('.', '__'))}`) ??
      document.querySelector<HTMLElement>(`[data-field-path="${CSS.escape(path)}"]`);
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    field?.focus({ preventScroll: true });
  });
};

const Notice: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="flex items-start gap-2 rounded-md bg-(--theme-elevation-50) px-3 py-2.5 text-sm text-(--theme-elevation-800)">
    <span className="mt-0.5 shrink-0">{icon}</span>
    <span>{children}</span>
  </div>
);

const FindingRow: React.FC<{
  finding: ProofreadFinding;
  locale: Config['locale'];
  onApply: () => void;
  onDismiss: () => void;
  onJump: () => void;
}> = ({ finding, locale, onApply, onDismiss, onJump }) => (
  <li className="border-t border-(--theme-elevation-100) px-3 py-2.5 first:border-t-0">
    <div className="mb-1 flex items-center gap-2 text-xs text-(--theme-elevation-500)">
      <span className="truncate">{finding.fieldLabel}</span>
      <Pill size="small" pillStyle="light-gray">
        {categoryStrings[finding.category][locale]}
      </Pill>
    </div>
    <p className="m-0 text-sm break-words text-(--theme-elevation-800)">
      {finding.before === '' ? '' : `…${finding.before}`}
      <del className="rounded-sm bg-(--theme-error-100) px-0.5 text-(--theme-error-750)">
        {finding.original}
      </del>{' '}
      <ins className="rounded-sm bg-(--theme-success-100) px-0.5 text-(--theme-success-750) no-underline">
        {finding.suggestion}
      </ins>
      {finding.after === '' ? '' : `${finding.after}…`}
    </p>
    {finding.explanation !== '' && (
      <p className="m-0 mt-1 text-xs text-(--theme-elevation-500)">{finding.explanation}</p>
    )}
    <div className="mt-2 flex gap-2">
      <Button
        buttonStyle="secondary"
        size="xsmall"
        margin={false}
        onClick={finding.applicable ? onApply : onJump}
      >
        {finding.applicable ? applyString[locale] : jumpString[locale]}
      </Button>
      <Button buttonStyle="subtle" size="xsmall" margin={false} onClick={onDismiss}>
        {dismissString[locale]}
      </Button>
    </div>
  </li>
);

/**
 * The proofreading inside the publish dialog. While it runs the dialog holds its confirm button
 * back, and the editor can skip it; when it fails or findings remain open, they can confirm.
 */
export const ProofreadPanel: React.FC<{
  locale: Config['locale'];
  /** Closes the dialog, so the editor can fix a finding in its field. */
  onClose: () => void;
  onCheckingChange: (checking: boolean) => void;
}> = ({ locale, onClose, onCheckingChange }) => {
  const { state, openFindings, apply, dismiss, skip } = useProofread(locale, onCheckingChange);

  if (state.kind === 'off' || state.kind === 'skipped') return <></>;

  if (state.kind === 'loading') {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-(--theme-elevation-50) px-3 py-2.5"
        aria-live="polite"
        aria-busy
      >
        <span className="flex items-start gap-2 text-sm text-(--theme-elevation-800)">
          <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span className="flex flex-col">
            {checkingString[locale]}
            <span className="text-xs text-(--theme-elevation-500)">
              {checkingHintString[locale]}
            </span>
          </span>
        </span>
        <Button buttonStyle="secondary" size="small" margin={false} onClick={skip}>
          {skipString[locale]}
        </Button>
      </div>
    );
  }

  if (state.kind === 'failed') {
    return <Notice icon={<Info className="h-4 w-4" aria-hidden />}>{failedString[locale]}</Notice>;
  }

  if (openFindings.length === 0) {
    const handled = state.findings.length > 0;
    // a clean result says so only for the text that was actually checked
    if (state.truncated) {
      return (
        <Notice icon={<Info className="h-4 w-4" aria-hidden />}>
          {handled ? allHandledString[locale] : cleanPartString[locale]} {truncatedString[locale]}
        </Notice>
      );
    }
    return (
      <Notice icon={<CircleCheck className="h-4 w-4 text-(--theme-success-500)" aria-hidden />}>
        {handled ? allHandledString[locale] : cleanString[locale]}
      </Notice>
    );
  }

  const jumpTo = (finding: ProofreadFinding): void => {
    onClose();
    scrollToField(finding.path);
  };

  return (
    <div aria-live="polite">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-(--theme-elevation-800)">
        <Sparkles className="h-4 w-4" aria-hidden />
        {headingString[locale]} · {openFindings.length}{' '}
        {openFindings.length === 1 ? oneFindingString[locale] : manyFindingsString[locale]}
      </div>
      <ul className="m-0 max-h-[45vh] list-none overflow-y-auto rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-50) p-0">
        {openFindings.map((finding) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            locale={locale}
            onApply={() => {
              if (!apply(finding)) jumpTo(finding);
            }}
            onDismiss={() => dismiss(finding)}
            onJump={() => jumpTo(finding)}
          />
        ))}
      </ul>
      <p className="m-0 mt-2 text-xs text-(--theme-elevation-500)">
        {state.truncated ? `${truncatedString[locale]} ` : ''}
        {footnoteString[locale]}
      </p>
    </div>
  );
};
