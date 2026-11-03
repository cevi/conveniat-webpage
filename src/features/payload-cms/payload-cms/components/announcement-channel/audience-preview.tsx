'use client';

import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { StaticTranslationString } from '@/types/types';
import { Banner, useConfig, useFormFields, useTranslation } from '@payloadcms/ui';
import type React from 'react';
import { useEffect, useState } from 'react';

/** Long enough to let a burst of clicks in the role list settle into one request. */
const DELAY_MS = 400;

const GROUP_ID_PATH = /^targetCeviGroups\.\d+\.groupId$/;

const reachesLabel = (count: number): StaticTranslationString => ({
  de: `Diese Auswahl erreicht ${String(count)} ${count === 1 ? 'Person' : 'Personen'}, die sich schon in der App angemeldet ${count === 1 ? 'hat' : 'haben'}.`,
  en: `This selection reaches ${String(count)} ${count === 1 ? 'person who has' : 'people who have'} already logged in to the app.`,
  fr: `Cette sélection atteint ${String(count)} ${count === 1 ? 'personne déjà connectée' : 'personnes déjà connectées'} à l’app.`,
});
const laterLabel: StaticTranslationString = {
  de: 'Wer dazugehört und sich erst später anmeldet, kommt bei der Anmeldung automatisch dazu.',
  en: 'Anyone who belongs to it and logs in later is added when they log in.',
  fr: 'Les personnes concernées qui se connectent plus tard sont ajoutées à leur connexion.',
};
const countingLabel: StaticTranslationString = {
  de: 'Zähle Personen …',
  en: 'Counting people …',
  fr: 'Décompte des personnes …',
};
const failedLabel: StaticTranslationString = {
  de: 'Die Anzahl Personen konnte nicht ermittelt werden.',
  en: 'Could not count the people of this selection.',
  fr: 'Impossible de compter les personnes de cette sélection.',
};
const avpLabel: StaticTranslationString = {
  de: 'Erreicht die Leitung jedes Hofs (AVP).',
  en: 'Reaches the leader of every Hof (AVP).',
  fr: 'Atteint la direction de chaque Hof (AVP).',
};

type CountState = { status: 'loading' } | { status: 'failed' } | { status: 'done'; count: number };

/**
 * Counts the logged-in people the audience being edited reaches, again whenever it changes.
 * `audience` is the request body, as a string so an unchanged audience sends nothing.
 */
const useAudienceCount = (audience: string): CountState => {
  const { config } = useConfig();
  const apiRoute = `${config.serverURL}${config.routes.api}`;
  // the answer remembers its audience, so a changed selection reads as loading until it lands
  const [answer, setAnswer] = useState<{ audience: string; state: CountState } | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${apiRoute}/announcement-channels/audience-preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: audience,
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
          const { count } = (await response.json()) as { count: number };
          setAnswer({ audience, state: { status: 'done', count } });
        })
        .catch(() => {
          if (!controller.signal.aborted) setAnswer({ audience, state: { status: 'failed' } });
        });
    }, DELAY_MS);
    return (): void => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [apiRoute, audience]);

  return answer?.audience === audience ? answer.state : { status: 'loading' };
};

/** Shows below the audience fields how many people the current selection reaches. */
export const AudiencePreview: React.FC = () => {
  const { i18n } = useTranslation();
  const locale = getAdminLocale(i18n);
  const audience = useFormFields(([fields]) =>
    JSON.stringify({
      targetType: fields['targetType']?.value,
      targetRoles: fields['targetRoles']?.value,
      targetCeviGroups: Object.entries(fields)
        .filter(([path]) => GROUP_ID_PATH.test(path))
        .map(([, field]) => ({ groupId: field.value })),
    }),
  );
  const isAvps = (JSON.parse(audience) as { targetType?: unknown }).targetType === 'avps';
  const state = useAudienceCount(audience);

  let text: string;
  if (state.status === 'loading') text = countingLabel[locale];
  else if (state.status === 'failed') text = failedLabel[locale];
  else text = `${reachesLabel(state.count)[locale]} ${laterLabel[locale]}`;

  return (
    <div className="field-type mb-8">
      {isAvps && <p className="m-0 mb-2 text-(--theme-elevation-500)">{avpLabel[locale]}</p>}
      <Banner type={state.status === 'failed' ? 'error' : 'info'} className="m-0">
        {text}
      </Banner>
    </div>
  );
};
