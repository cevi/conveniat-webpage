/**
 * @jest-environment jsdom
 */

// The CTA's LinkComponent reaches for the validated env at import time, which
// no test process has.
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch',
  },
}));

import type { DonationBarometerFigures } from '@/features/payload-cms/components/content-blocks/donation-barometer';
import { DonationBarometer } from '@/features/payload-cms/components/content-blocks/donation-barometer';
import type { Locale } from '@/types/types';
import { render, screen } from '@testing-library/react';

const renderBarometer = (figures: DonationBarometerFigures, locale: Locale = 'de'): void => {
  render(
    <DonationBarometer title="Damit jedes Kind ins Lager kann" figures={figures} locale={locale} />,
  );
};

/**
 * Swiss locales group thousands with an apostrophe, but which apostrophe is an
 * ICU detail that moves between Node builds. Composing the expected text the
 * same way keeps these tests about the sentence and the amount.
 */
const amount = (value: number, locale: Locale = 'de'): string =>
  new Intl.NumberFormat(locale === 'fr' ? 'fr-CH' : 'de-CH', { maximumFractionDigits: 0 }).format(
    value,
  );

describe('DonationBarometer', () => {
  it('names the gap to the next milestone the campaign has not funded yet', (): void => {
    renderBarometer({
      goalAmount: 250_000,
      raisedAmount: 162_400,
      milestones: [
        { id: 'm1', amount: 120_000, label: 'Verpflegung' },
        { id: 'm2', amount: 180_000, label: 'Programm' },
      ],
    });

    expect(screen.getByText(`Noch ${amount(17_600)} Franken bis «Programm».`)).toBeInTheDocument();
  });

  it('sorts milestones by amount, so the next one up does not depend on row order', (): void => {
    renderBarometer({
      goalAmount: 250_000,
      // Below both milestones on purpose: at an amount above the lower one,
      // the unsorted array yields the same answer and the assertion proves
      // nothing about sorting.
      raisedAmount: 100_000,
      milestones: [
        { id: 'm2', amount: 180_000, label: 'Programm' },
        { id: 'm1', amount: 120_000, label: 'Verpflegung' },
      ],
    });

    expect(
      screen.getByText(`Noch ${amount(20_000)} Franken bis «Verpflegung».`),
    ).toBeInTheDocument();
  });

  it('falls back to the goal once every milestone is funded', (): void => {
    renderBarometer({
      goalAmount: 250_000,
      raisedAmount: 200_000,
      milestones: [{ id: 'm1', amount: 120_000, label: 'Verpflegung' }],
    });

    expect(screen.getByText(`Noch ${amount(50_000)} Franken fehlen.`)).toBeInTheDocument();
  });

  it('asks for the first donation rather than reporting a gap when nothing came in', (): void => {
    renderBarometer({ goalAmount: 250_000, raisedAmount: 0 });

    expect(screen.getByText('Noch keine Spende — sei die erste.')).toBeInTheDocument();
  });

  it('celebrates instead of counting down once the goal is passed', (): void => {
    renderBarometer({ goalAmount: 250_000, raisedAmount: 262_000 });

    expect(screen.getByText('Das Ziel ist erreicht. Danke!')).toBeInTheDocument();
  });

  // Drafts skip field validation, so the renderer sees values the CMS would
  // have rejected. None of these may take the page down.
  it('still shows the amount when a draft has no goal yet', (): void => {
    renderBarometer({ raisedAmount: 12_500 });

    expect(screen.getByText(amount(12_500))).toBeInTheDocument();
    expect(screen.getByText('Franken')).toBeInTheDocument();
  });

  it('treats a negative raised amount as nothing raised', (): void => {
    renderBarometer({ goalAmount: 250_000, raisedAmount: -400 });

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Spende — sei die erste.')).toBeInTheDocument();
  });

  it('ignores milestone rows an editor left half-filled', (): void => {
    renderBarometer({
      goalAmount: 250_000,
      raisedAmount: 100_000,
      milestones: [
        { id: 'm1', amount: 120_000, label: '' },
        { id: 'm2', label: 'Ohne Betrag' },
        { id: 'm3', amount: 180_000, label: 'Programm' },
      ],
    });

    expect(screen.getByText(`Noch ${amount(80_000)} Franken bis «Programm».`)).toBeInTheDocument();
  });

  it('translates the whole caption, not just the number', (): void => {
    renderBarometer({ goalAmount: 250_000, raisedAmount: 162_400 }, 'fr');

    expect(
      screen.getByText(`Il manque encore ${amount(87_600, 'fr')} francs.`),
    ).toBeInTheDocument();
  });
});
