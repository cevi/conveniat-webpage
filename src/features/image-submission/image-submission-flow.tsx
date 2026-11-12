'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { ImageSubmissionTexts } from '@/features/image-submission/api/image-submission-texts';
import { IntroStep } from '@/features/image-submission/intro-step';
import { OwnImagesSection } from '@/features/image-submission/own-images-section';
import { TermsStep } from '@/features/image-submission/terms-step';
import { UploadForm } from '@/features/image-submission/upload-form';
import { useIntroSeen } from '@/features/image-submission/use-intro-seen';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { CircleCheck, ImageOff, Info, Image as LucideImageIcon } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

type Step = 'intro' | 'terms' | 'upload' | 'success';

const howItWorks: StaticTranslationString = {
  de: "So funktioniert's",
  en: 'How it works',
  fr: 'Comment ça marche',
};

const notReadyTitle: StaticTranslationString = {
  de: 'Bild-Upload noch nicht offen',
  en: 'Image upload not open yet',
  fr: "L'envoi d'images n'est pas encore ouvert",
};

const notReadyText: StaticTranslationString = {
  de: 'Die Bedingungen für den Bild-Upload fehlen noch. Versuch es später nochmals.',
  en: 'The terms for the image upload are still missing. Please try again later.',
  fr: "Les conditions de l'envoi d'images manquent encore. Réessaie plus tard.",
};

const successTitle: StaticTranslationString = {
  de: 'Danke für deine Bilder',
  en: 'Thank you for your images',
  fr: 'Merci pour tes images',
};

const submitMoreButton: StaticTranslationString = {
  en: 'Submit More Images',
  de: 'Weitere Bilder einreichen',
  fr: "Soumettre plus d'images",
};

/**
 * The image upload from the first visit on: the introduction once per device, the terms before
 * anything is chosen, then the upload and the thanks. The agreement holds until the page is left.
 */
export const ImageSubmissionFlow: React.FC<{ texts: ImageSubmissionTexts }> = ({ texts }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { introSeen, markIntroSeen } = useIntroSeen();
  const [chosenStep, setChosenStep] = useState<Step | undefined>();
  const [agreed, setAgreed] = useState(false);

  const hasIntro = texts.introTitle !== '' || texts.introText !== '' || texts.introSteps.length > 0;

  // Nobody can agree to terms that are not there, so without them there is no upload at all.
  if (texts.termsFullText === '') {
    return (
      <>
        <SetHeaderActions />
        <EmptyState
          icon={ImageOff}
          title={notReadyTitle[locale]}
          description={notReadyText[locale]}
        />
      </>
    );
  }

  const afterIntro: Step = agreed ? 'upload' : 'terms';
  const firstStep = (): Step | undefined => {
    // until hydration tells whether this device saw the intro, nothing is shown
    if (introSeen === null) return undefined;
    return hasIntro && !introSeen ? 'intro' : afterIntro;
  };
  const step = chosenStep ?? firstStep();

  return (
    <>
      <SetHeaderActions>
        {hasIntro && step !== 'intro' && (
          <Button
            variant="plain"
            size="touchIcon"
            aria-label={howItWorks[locale]}
            onClick={() => setChosenStep('intro')}
          >
            <Info aria-hidden="true" />
          </Button>
        )}
      </SetHeaderActions>

      {step === 'intro' && (
        <IntroStep
          title={texts.introTitle}
          text={texts.introText}
          steps={texts.introSteps}
          onContinue={() => {
            markIntroSeen();
            setChosenStep(afterIntro);
          }}
        />
      )}

      {step === 'terms' && (
        <TermsStep
          lead={texts.termsLead}
          summary={texts.termsSummary}
          fullText={texts.termsFullText}
          onAgree={() => {
            setAgreed(true);
            setChosenStep('upload');
          }}
        />
      )}

      {step === 'upload' && (
        <UploadForm
          photoTips={texts.photoTips}
          termsFullText={texts.termsFullText}
          termsVersion={texts.termsVersion}
          onUploaded={() => setChosenStep('success')}
        />
      )}

      {step === 'success' && (
        <div className="space-y-6">
          <EmptyState
            icon={CircleCheck}
            title={successTitle[locale]}
            {...(texts.successText === ''
              ? {}
              : { description: <span className="whitespace-pre-line">{texts.successText}</span> })}
            action={
              <Button variant="primary" size="touch" onClick={() => setChosenStep('upload')}>
                <LucideImageIcon aria-hidden="true" />
                {submitMoreButton[locale]}
              </Button>
            }
          />
          <OwnImagesSection />
        </div>
      )}
    </>
  );
};
