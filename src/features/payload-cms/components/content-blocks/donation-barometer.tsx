import { LinkComponent } from '@/components/ui/link-component';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowRight } from 'lucide-react';
import type React from 'react';

export interface DonationBarometerMilestone {
  id?: string | null;
  amount?: number | null;
  label?: string | null;
}

/** The per-placement fields, from the block. */
export interface DonationBarometerType {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  buttonLabel?: string | null;
  linkField?: LinkFieldDataType;
}

/** The campaign figures, from the `donation-barometer` global. */
export interface DonationBarometerFigures {
  goalAmount?: number | null;
  raisedAmount?: number | null;
  lastUpdated?: string | null;
  milestones?: DonationBarometerMilestone[] | null;
}

/**
 * Swiss number formatting, so the amount reads the way a Swiss donor writes it.
 *
 * The figure is printed without a currency symbol and the word "Franken" is
 * carried by the line underneath: at 5.5rem a three-letter prefix takes a
 * quarter of the width and says nothing the sentence below does not.
 */
const intlLocale: Record<Locale, string> = {
  de: 'de-CH',
  en: 'en-CH',
  fr: 'fr-CH',
};

const formatNumber = (amount: number, locale: Locale): string =>
  new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 0 }).format(amount);

const ofGoalText = (goal: string, locale: Locale): string => {
  const text: StaticTranslationString = {
    de: `Franken von ${goal}`,
    en: `francs of ${goal}`,
    fr: `francs sur ${goal}`,
  };
  return text[locale];
};

const currencyText: StaticTranslationString = {
  de: 'Franken',
  en: 'francs',
  fr: 'francs',
};

const noDonationsYetText: StaticTranslationString = {
  de: 'Noch keine Spende — sei die erste.',
  en: 'No donations yet — be the first.',
  fr: 'Aucun don pour l’instant — sois le premier.',
};

const goalReachedText: StaticTranslationString = {
  de: 'Das Ziel ist erreicht. Danke!',
  en: 'We have reached the goal. Thank you!',
  fr: 'L’objectif est atteint. Merci !',
};

const remainingToGoalText = (amount: string, locale: Locale): string => {
  const text: StaticTranslationString = {
    de: `Noch ${amount} Franken fehlen.`,
    en: `${amount} francs still to go.`,
    fr: `Il manque encore ${amount} francs.`,
  };
  return text[locale];
};

/**
 * This design has no picture for milestones, but it can still name the next one
 * — which is the half that moves a donation, and it is text like everything
 * else here.
 */
const remainingToMilestoneText = (amount: string, milestone: string, locale: Locale): string => {
  const text: StaticTranslationString = {
    de: `Noch ${amount} Franken bis «${milestone}».`,
    en: `${amount} francs still to go until “${milestone}”.`,
    fr: `Encore ${amount} francs jusqu’à « ${milestone} ».`,
  };
  return text[locale];
};

const asOfText = (date: string, locale: Locale): string => {
  const text: StaticTranslationString = {
    de: `Stand vom ${date}`,
    en: `Figures as of ${date}`,
    fr: `Chiffres au ${date}`,
  };
  return text[locale];
};

/**
 * Renders the Spendenbarometer as a figure rather than a meter: the amount
 * raised, set large, the goal named beside it, and one hairline under the block
 * whose green portion is the only proportional element on the card.
 *
 * Both the figures and the milestones come from the `donation-barometer`
 * global; this component only lays them out. Drafts skip validation, so the
 * figures can arrive missing or nonsensical — without a usable goal the card
 * drops the rule and the comparison and shows the amount alone, which still
 * reads as finished.
 */
export const DonationBarometer: React.FC<
  DonationBarometerType & { figures: DonationBarometerFigures; locale: Locale }
> = ({ eyebrow, title, description, buttonLabel, linkField, figures, locale }) => {
  const url = getURLForLinkField(linkField, locale);
  const hasDestination =
    url !== undefined &&
    url !== '' &&
    buttonLabel !== undefined &&
    buttonLabel !== null &&
    buttonLabel !== '';

  const goal = figures.goalAmount ?? 0;
  const raised = Math.max(figures.raisedAmount ?? 0, 0);
  const hasGoal = goal > 0;

  const ratio = hasGoal ? Math.min(raised / goal, 1) : 0;

  const milestones = (figures.milestones ?? [])
    .filter(
      (milestone): milestone is DonationBarometerMilestone & { amount: number; label: string } =>
        typeof milestone.amount === 'number' &&
        milestone.amount > 0 &&
        typeof milestone.label === 'string' &&
        milestone.label !== '',
    )
    // Editors add rows in whatever order they think of them, so the next one up
    // is only the next one up after sorting.
    .sort((first, second) => first.amount - second.amount);

  const nextMilestone = milestones.find((milestone) => milestone.amount > raised);

  const caption = ((): string => {
    if (raised === 0) return noDonationsYetText[locale];
    if (!hasGoal) return '';
    if (raised >= goal) return goalReachedText[locale];
    if (nextMilestone !== undefined && nextMilestone.amount <= goal) {
      return remainingToMilestoneText(
        formatNumber(nextMilestone.amount - raised, locale),
        nextMilestone.label,
        locale,
      );
    }
    return remainingToGoalText(formatNumber(goal - raised, locale), locale);
  })();

  const asOf = ((): string => {
    const raw = figures.lastUpdated;
    if (raw === undefined || raw === null || raw === '') return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    return asOfText(date.toLocaleDateString(intlLocale[locale]), locale);
  })();

  return (
    <div className="border-l-conveniat-green rounded-2xl border border-l-4 border-gray-200 bg-white p-5 shadow-2xs sm:p-6">
      {eyebrow !== undefined && eyebrow !== null && eyebrow !== '' && (
        <div className="mb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
          {eyebrow}
        </div>
      )}
      <h3 className="font-heading text-conveniat-green text-xl leading-tight font-bold text-balance sm:text-2xl">
        {title}
      </h3>

      {description !== undefined && description !== null && description !== '' && (
        <p className="font-body mt-3 text-sm leading-relaxed whitespace-pre-line text-gray-600">
          {description}
        </p>
      )}

      {/* The figure is the graphic here, so it is sized like one. `globals.scss`
          already scales the root font size per breakpoint, so these two steps
          run from roughly 60px on a phone to 90px on a desktop. Tabular
          numerals keep a rising amount from reflowing the line under it. */}
      <p className="font-heading text-conveniat-green mt-6 text-6xl leading-none font-bold tabular-nums sm:text-7xl">
        {formatNumber(raised, locale)}
      </p>
      <p className="font-body mt-2 text-sm text-gray-500">
        {hasGoal ? ofGoalText(formatNumber(goal, locale), locale) : currencyText[locale]}
      </p>

      {hasGoal && (
        <div className="mt-5 h-0.5 w-full bg-gray-200" aria-hidden="true">
          <div className="bg-conveniat-green h-full" style={{ width: `${ratio * 100}%` }} />
        </div>
      )}

      {(caption !== '' || hasDestination) && (
        <div
          className={cn(
            'mt-5 flex flex-col gap-3 sm:flex-row sm:items-center',
            caption === '' ? 'sm:justify-end' : 'sm:justify-between',
          )}
        >
          {caption !== '' && (
            <p className="font-body text-sm text-pretty text-gray-600">{caption}</p>
          )}
          {hasDestination && (
            <LinkComponent
              href={url}
              openInNewTab={openURLInNewTab(linkField)}
              hideExternalIcon
              className="block no-underline"
            >
              <span className="font-heading group bg-conveniat-green inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-6 py-2.5 text-center text-base leading-normal font-bold text-white duration-100 hover:bg-green-700 sm:w-auto">
                {buttonLabel}
                <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </LinkComponent>
          )}
        </div>
      )}

      {asOf !== '' && <p className="font-body mt-3 text-xs text-gray-400">{asOf}</p>}
    </div>
  );
};
