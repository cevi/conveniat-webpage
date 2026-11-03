import type { Locale, StaticTranslationString } from '@/types/types';
import {
  errorMessageTranslation,
  invalidInputTranslation,
  noConnectionTranslation,
} from '@/utils/shared-translations';
import { TRPCClientError } from '@trpc/client';

/** The values a reason's text is filled in with, like `{title}` or `{n}`. */
export type ErrorParameters = Record<string, string | number>;

/** The texts of a feature's refusals, by reason. Imported by its routers and its components. */
export type ErrorTexts = Record<string, StaticTranslationString>;

/** Why the server refused a call, as a router names it with `UserFacingTRPCError`. */
export interface ErrorReason {
  reason: string;
  params: ErrorParameters;
}

/** The reason every input that fails its schema is refused with, see `formatTRPCError`. */
export const INVALID_INPUT_REASON = 'invalidInput';

/** Fills `{name}` placeholders in with `params`. */
export const formatErrorText = (template: string, params: ErrorParameters = {}): string =>
  template.replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );

/**
 * Whether a tRPC call failed before the server answered with a tRPC error: no connection,
 * the service worker giving up, or a proxy page instead of JSON. Only a real tRPC answer
 * carries `data`, so its absence is the signal. The message is useless for this, because it
 * differs per browser (Safari says "Load failed", Chrome "Failed to fetch").
 */
export const isTransportError = (error: unknown): boolean =>
  error instanceof TRPCClientError && error.data === undefined;

/** The reason and params in an error's data, as `formatTRPCError` and the form hooks send them. */
export const reasonOf = (data: unknown): ErrorReason | undefined => {
  if (typeof data !== 'object' || data === null || !('reason' in data)) return undefined;
  if (typeof data.reason !== 'string') return undefined;
  const params = 'params' in data && typeof data.params === 'object' ? data.params : undefined;
  return { reason: data.reason, params: (params ?? {}) as ErrorParameters };
};

/** The reason a router refused the call with, or `undefined` for any other failure. */
export const errorReasonOf = (error: unknown): ErrorReason | undefined =>
  error instanceof TRPCClientError ? reasonOf((error as TRPCClientError<never>).data) : undefined;

/**
 * The text of a reason in `locale`, with its params filled in, or `undefined` when `texts` do
 * not know the reason. Own keys only: a reason named like `constructor` is not a text.
 */
export const errorTextFor = (
  refusal: ErrorReason,
  locale: Locale,
  texts: ErrorTexts,
): string | undefined => {
  if (refusal.reason === INVALID_INPUT_REASON) return invalidInputTranslation[locale];
  if (!Object.hasOwn(texts, refusal.reason)) return undefined;
  const text = texts[refusal.reason];
  return text === undefined ? undefined : formatErrorText(text[locale], refusal.params);
};

/**
 * The sentence to show a user for a failed tRPC call, in the language of the page.
 *
 * A router names why it refused a call (see `UserFacingTRPCError`), and the feature's `texts`
 * say it in each locale. A call that never reached the server says so instead of passing on the
 * browser's English. A crash, or a reason these texts do not know, gets `fallback`.
 */
export const userErrorMessage = (
  error: unknown,
  locale: Locale,
  texts: ErrorTexts = {},
  fallback: StaticTranslationString = errorMessageTranslation,
): string => {
  if (isTransportError(error)) return noConnectionTranslation[locale];
  const refusal = errorReasonOf(error);
  const text = refusal === undefined ? undefined : errorTextFor(refusal, locale, texts);
  return text ?? fallback[locale];
};
