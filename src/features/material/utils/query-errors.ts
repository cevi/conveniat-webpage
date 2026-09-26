/** The part of a tRPC client error the material views read. */
export interface MaterialQueryErrorLike {
  message: string;
  data?: { code?: string | undefined; httpStatus?: number | undefined } | null | undefined;
}

const MAX_RETRIES = 3;

/**
 * Retries only what can get better on its own. A 4xx answer, signed out, not in the material
 * team or not found, is the same on the next try, and retrying it only delays the message.
 */
export const shouldRetryMaterialQuery = (
  failureCount: number,
  error: Pick<MaterialQueryErrorLike, 'data'>,
): boolean => {
  const status = error.data?.httpStatus;
  if (status !== undefined && status < 500) return false;
  return failureCount < MAX_RETRIES;
};

export type MaterialErrorKind = 'signedOut' | 'forbidden' | 'notFound' | 'other';

/** Which message a failed query deserves. */
export const getMaterialErrorKind = (
  error: Pick<MaterialQueryErrorLike, 'data'> | null | undefined,
): MaterialErrorKind => {
  switch (error?.data?.code) {
    case 'UNAUTHORIZED': {
      return 'signedOut';
    }
    case 'FORBIDDEN': {
      return 'forbidden';
    }
    case 'NOT_FOUND': {
      return 'notFound';
    }
    default: {
      return 'other';
    }
  }
};
