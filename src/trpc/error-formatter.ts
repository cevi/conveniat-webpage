import {
  type ErrorParameters,
  type ErrorTexts,
  formatErrorText,
  INVALID_INPUT_REASON,
} from '@/utils/user-error-message';
import { type TRPCDefaultErrorShape, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';

/**
 * A refusal the user should read. It carries a reason, not a sentence: the browser translates
 * the reason into the language of the page with `userErrorMessage`. The message is the English
 * text, for the logs and for a browser still running the release before this one.
 */
export class UserFacingTRPCError extends TRPCError {
  readonly reason: string;
  readonly params: ErrorParameters;

  constructor(options: {
    code: TRPCError['code'];
    reason: string;
    params?: ErrorParameters | undefined;
    message: string;
  }) {
    super({ code: options.code, message: options.message });
    this.reason = options.reason;
    this.params = options.params ?? {};
  }
}

/**
 * A refusal of a call our own client never makes: a forged id, another chat's image, a state
 * the UI cannot reach. It carries no reason, so the user reads the generic fallback, and the
 * tRPC route logs it at `warn`, because a hit means a bug in our client or someone probing the
 * API. A refusal a legitimate client can trigger, also from the offline outbox or a stale
 * persisted cache, is a reason from `createErrorThrower` instead.
 */
export class InvariantTRPCError extends TRPCError {}

/** Refuses a call our own client never makes, see {@link InvariantTRPCError}. */
export const invariantError = (code: TRPCError['code'], message: string): InvariantTRPCError =>
  new InvariantTRPCError({ code, message });

/**
 * Binds a feature's error texts, so its routers can only throw reasons its components can
 * translate.
 */
export const createErrorThrower =
  <T extends ErrorTexts>(texts: T) =>
  (
    code: TRPCError['code'],
    reason: keyof T & string,
    params?: ErrorParameters,
    /** what a browser on the previous release matches on, where it parsed the message */
    legacyMessage?: string,
  ): UserFacingTRPCError =>
    new UserFacingTRPCError({
      code,
      reason,
      params,
      message: legacyMessage ?? formatErrorText(texts[reason]?.en ?? reason, params),
    });

export type ErrorShape = TRPCDefaultErrorShape & {
  data: TRPCDefaultErrorShape['data'] & { reason?: string; params?: ErrorParameters };
};

/**
 * Puts the reason of a refusal into the error the client receives. An input that failed its
 * schema is refused as `invalidInput`; zod's own message is its issue list as JSON.
 */
export const formatTRPCError = ({
  shape,
  error,
}: {
  shape: TRPCDefaultErrorShape;
  error: TRPCError;
}): ErrorShape => {
  if (error instanceof UserFacingTRPCError) {
    return { ...shape, data: { ...shape.data, reason: error.reason, params: error.params } };
  }
  if (error.code === 'BAD_REQUEST' && error.cause instanceof ZodError) {
    return { ...shape, data: { ...shape.data, reason: INVALID_INPUT_REASON } };
  }
  return shape;
};
