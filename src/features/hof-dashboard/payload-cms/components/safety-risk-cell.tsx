'use client';

import { SAFETY_RISK_LABELS } from '@/features/hof-dashboard/constants';
import type { StaticTranslationString } from '@/types/types';
import { Pill, useTranslation } from '@payloadcms/ui';
import type React from 'react';

const LABELS: Record<'yes' | 'no' | 'open', StaticTranslationString> = {
  ...SAFETY_RISK_LABELS,
  open: { de: 'Offen', en: 'Open', fr: 'Ouvert' },
};

const PILL_STYLE = { yes: 'warning', no: 'success', open: 'light-gray' } as const;

/**
 * The Hof's answer to "elevated safety risk?" in the list. Without it, Payload's placeholder
 * for an empty select reads like the answer "no risk".
 */
export const SafetyRiskCell: React.FC<{ cellData?: unknown }> = ({ cellData }) => {
  const { i18n } = useTranslation();
  const answer = cellData === 'yes' || cellData === 'no' ? cellData : 'open';
  const language = i18n.language as keyof StaticTranslationString;
  return (
    <Pill pillStyle={PILL_STYLE[answer]} size="small">
      {(LABELS[answer][language] as string | undefined) ?? LABELS[answer].de}
    </Pill>
  );
};
