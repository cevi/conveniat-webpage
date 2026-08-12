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
  const logos = paymentMethods
    .map((paymentMethod) => paymentMethod.logo)
    .filter(
      (logo): logo is ImageType & { url: string } =>
        typeof logo === 'object' && typeof logo.url === 'string' && logo.url !== '',
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
        {logos.map((logo) => (
          <div
            key={logo.id}
            className="relative h-7 w-14 shrink-0 overflow-hidden rounded-md bg-white p-1 shadow-xs"
          >
            <ImageNode
              src={logo.url}
              alt={getImageAltInLocale(locale, logo)}
              fill
              sizes="56px"
              className="object-contain p-1"
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

  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-2xl p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:gap-10',
        isHighlighted
          ? 'bg-conveniat-green text-white shadow-md'
          : 'border border-gray-200 bg-white shadow-2xs',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              isHighlighted ? 'bg-white/15 text-white' : 'text-conveniat-green bg-green-100',
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

        {description !== undefined && description !== null && description !== '' && (
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
          <div className="mt-5">
            <PaymentMethodLogos
              paymentMethods={paymentMethods}
              locale={locale}
              isHighlighted={isHighlighted}
            />
          </div>
        )}
      </div>

      {url !== undefined && url !== '' && (
        <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">
          <LinkComponent
            href={url}
            openInNewTab={openURLInNewTab(linkField)}
            hideExternalIcon
            className="block no-underline"
          >
            <span
              className={cn(
                'font-heading group inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-8 py-3 text-center text-lg leading-normal font-bold duration-100',
                isHighlighted
                  ? 'text-conveniat-green bg-white hover:bg-green-50'
                  : 'bg-red-700 text-red-100 hover:bg-red-800',
              )}
            >
              {buttonLabel}
              <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </LinkComponent>

          {note !== undefined && note !== null && note !== '' && (
            <p
              className={cn(
                'font-body max-w-[280px] text-center text-xs leading-snug md:text-right',
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
