'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import type { TitledPoint } from '@/features/image-submission/api/image-submission-texts';
import { contentIconOf } from '@/features/payload-cms/content-icons';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ImageUp } from 'lucide-react';
import type React from 'react';

const continueLabel: StaticTranslationString = {
  de: 'Weiter',
  en: 'Continue',
  fr: 'Continuer',
};

/** The step's icon as the editors chose it, or its number where they chose none. */
const StepTile: React.FC<{ icon: string; number: number }> = ({ icon, number }) => {
  const Icon = contentIconOf(icon);
  if (Icon !== undefined) return <IconTile icon={Icon} />;
  return (
    <span
      aria-hidden="true"
      className="bg-tint font-heading text-conveniat-green flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold"
    >
      {number}
    </span>
  );
};

/** What the image upload is for and how it goes, in the editors' words. */
export const IntroStep: React.FC<{
  title: string;
  text: string;
  steps: TitledPoint[];
  onContinue: () => void;
}> = ({ title, text, steps, onContinue }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="space-y-5">
      <IconTile icon={ImageUp} size="lg" />
      {title !== '' && (
        <h2 className="font-heading text-heading text-[28px] leading-tight font-extrabold text-balance">
          {title}
        </h2>
      )}
      {text !== '' && <p className="text-[15px] leading-normal text-green-700">{text}</p>}

      {steps.length > 0 && (
        <Card as="ul" divided>
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3 px-4 py-3">
              <StepTile icon={step.icon} number={index + 1} />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-green-900">{step.title}</span>
                {step.text !== '' && (
                  <span className="block text-[13px] leading-normal text-green-700">
                    {step.text}
                  </span>
                )}
              </span>
            </li>
          ))}
        </Card>
      )}

      <Button variant="primary" size="touch" className="w-full" onClick={onContinue}>
        {continueLabel[locale]}
      </Button>
    </div>
  );
};
