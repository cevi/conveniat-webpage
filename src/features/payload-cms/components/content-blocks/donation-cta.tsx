import { LinkComponent } from '@/components/ui/link-component';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image as ImageType } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowRight, HeartHandshake } from 'lucide-react';
import ImageNode from 'next/image';
import type React from 'react';

export interface DonationCtaPaymentMethod {
  id?: string | null;
  logo: ImageType | string;
}

export interface DonationCtaType {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  buttonLabel: string;
  linkField?: LinkFieldDataType;
  paymentMethods?: DonationCtaPaymentMethod[] | null;
  note?: string | null;
  variant: 'highlight' | 'card';
}

const paymentMethodsLabel: StaticTranslationString = {
  de: 'Sichere Zahlung mit',
  en: 'Secure payment with',
  fr: 'Paiement sécurisé avec',
};

const PaymentMethodLogos: React.FC<{
  paymentMethods: DonationCtaPaymentMethod[];
  locale: Locale;
  isHighlighted: boolean;
}> = ({ paymentMethods, locale, isHighlighted }) => {
  // Key by the array row, not by the image: the same logo may be selected in
  // several rows, which would give those siblings a duplicate React key.
  const logos = paymentMethods
    .map((paymentMethod, index) => ({
      key: paymentMethod.id ?? `payment-method-${index}`,
      logo: paymentMethod.logo,
    }))
    .filter(
      (entry): entry is { key: string; logo: ImageType & { url: string } } =>
        typeof entry.logo === 'object' &&
        typeof entry.logo.url === 'string' &&
        entry.logo.url !== '',
    );

  if (logos.length === 0) return <></>;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        className={cn(
          'text-[10px] font-bold tracking-wider uppercase',
          isHighlighted ? 'text-green-200' : 'text-gray-400',
        )}
      >
        {paymentMethodsLabel[locale]}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {logos.map(({ key, logo }) => (
          <div
            key={key}
            className="relative h-9 w-16 shrink-0 overflow-hidden rounded-md bg-white shadow-xs"
          >
            <ImageNode
              src={logo.url}
              alt={getImageAltInLocale(locale, logo)}
              fill
              sizes="64px"
              className="object-contain p-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Renders a prominent donation call-to-action which links out to the payment
 * provider (e.g. a RaiseNow Paylink). The link-out is intentional: TWINT,
 * 3-D Secure and Apple Pay need a top-level navigation to work reliably.
 */
export const DonationCta: React.FC<DonationCtaType & { locale: Locale }> = ({
  eyebrow,
  title,
  description,
  buttonLabel,
  linkField,
  paymentMethods,
  note,
  variant,
  locale,
}) => {
  const url = getURLForLinkField(linkField, locale);
  const isHighlighted = variant === 'highlight';

  // The destination is a required field, but it can still resolve to undefined
  // at render time — e.g. for a reference that was deleted or is not populated.
  const hasDestination = url !== undefined && url !== '';
  const hasNote = note !== undefined && note !== null && note !== '';
  const hasDescription = description !== undefined && description !== null && description !== '';
  const hasPaymentMethods =
    paymentMethods !== undefined && paymentMethods !== null && paymentMethods.length > 0;

  // A card carrying nothing but a title and a link is a single row. Given the
  // padding the full variant needs, it just reads as hollow.
  const isCompact = !isHighlighted && !hasDescription && !hasPaymentMethods;

  // The note is the payment-assurance line ("… sicher über RaiseNow …"). It
  // does its trust-signal job right next to the badges it vouches for, so it
  // only falls back under the button when there are no badges.
  const noteBesideBadges = hasNote && hasPaymentMethods;
  const noteBelowButton = hasNote && !hasPaymentMethods;

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl md:flex-row md:items-center md:justify-between',
        isHighlighted
          ? 'bg-conveniat-green gap-6 p-6 text-white shadow-md sm:p-8 md:gap-10'
          : 'gap-4 border border-gray-200 bg-white p-5 shadow-2xs sm:p-6 md:gap-8',
        // Kept in its own argument: tailwind-merge drops the accent if the
        // generic `border-gray-200` is allowed to come after it.
        !isHighlighted && 'border-l-conveniat-green border-l-4',
        isCompact && 'gap-3 py-4 sm:py-4',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              isHighlighted ? 'bg-white/15 text-white' : 'bg-conveniat-green text-white',
            )}
            aria-hidden="true"
          >
            <HeartHandshake className="size-5" />
          </div>
          <div className="min-w-0">
            {eyebrow !== undefined && eyebrow !== null && eyebrow !== '' && (
              <div
                className={cn(
                  'mb-0.5 text-[10px] font-bold tracking-wider uppercase',
                  isHighlighted ? 'text-green-200' : 'text-gray-400',
                )}
              >
                {eyebrow}
              </div>
            )}
            <h3
              className={cn(
                'font-heading text-xl leading-tight font-bold text-balance sm:text-2xl',
                isHighlighted ? 'text-white' : 'text-conveniat-green',
              )}
            >
              {title}
            </h3>
          </div>
        </div>

        {hasDescription && (
          <p
            className={cn(
              'font-body mt-4 text-sm leading-relaxed whitespace-pre-line',
              isHighlighted ? 'text-green-100' : 'text-gray-600',
            )}
          >
            {description}
          </p>
        )}

        {paymentMethods && paymentMethods.length > 0 && (
          <div className="mt-5 flex flex-col gap-1.5">
            <PaymentMethodLogos
              paymentMethods={paymentMethods}
              locale={locale}
              isHighlighted={isHighlighted}
            />
            {noteBesideBadges && (
              <p
                className={cn(
                  'font-body max-w-[26rem] text-xs leading-snug text-pretty',
                  isHighlighted ? 'text-green-200' : 'text-gray-500',
                )}
              >
                {note}
              </p>
            )}
          </div>
        )}
      </div>

      {(hasDestination || noteBelowButton) && (
        <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">
          {hasDestination && (
            <LinkComponent
              href={url}
              openInNewTab={openURLInNewTab(linkField)}
              hideExternalIcon
              className="block no-underline"
            >
              <span
                className={cn(
                  'font-heading group inline-flex w-full items-center justify-center gap-2 leading-normal font-bold duration-100',
                  isHighlighted
                    ? 'text-conveniat-green rounded-[8px] bg-white px-8 py-3 text-center text-lg hover:bg-green-50'
                    : 'text-conveniat-green hover:text-conveniat-green/75 py-1 text-base underline-offset-4 hover:underline md:w-auto',
                )}
              >
                {buttonLabel}
                <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </LinkComponent>
          )}

          {noteBelowButton && (
            <p
              className={cn(
                'font-body max-w-[17rem] text-center text-xs leading-snug text-balance md:text-right',
                isHighlighted ? 'text-green-200' : 'text-gray-500',
              )}
            >
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
