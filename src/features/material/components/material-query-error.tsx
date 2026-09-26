'use client';

import { labels } from '@/features/material/components/material-labels';
import { EmptyState, MaterialButton } from '@/features/material/components/material-ui';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import {
  getMaterialErrorKind,
  type MaterialQueryErrorLike,
} from '@/features/material/utils/query-errors';
import type { StaticTranslationString } from '@/types/types';
import { LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type React from 'react';
import { useCallback } from 'react';

const messages: Record<'forbidden' | 'notFound' | 'other', StaticTranslationString> = {
  forbidden: labels.teamOnly,
  notFound: labels.notFound,
  other: labels.error,
};

/** Signs in through Cevi.DB and comes back to the page the reader was on. */
const useSignIn = (): (() => void) =>
  useCallback((): void => {
    void (async (): Promise<void> => {
      const response = await signIn('cevi-db', {
        redirect: false,
        callbackUrl: globalThis.location.href,
      });
      if (typeof response.url === 'string') {
        globalThis.location.href = response.url;
      }
    })();
  }, []);

/**
 * What a failed material query tells the reader: sign in, this is the material team's page,
 * or it does not exist. Never the raw error code.
 */
export const MaterialQueryError: React.FC<{
  error: Pick<MaterialQueryErrorLike, 'data'> | null | undefined;
}> = ({ error }) => {
  const locale = useMaterialLocale();
  const login = useSignIn();
  const kind = getMaterialErrorKind(error);

  if (kind === 'signedOut') {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-gray-600">
        {labels.notSignedIn[locale]}
        <MaterialButton onClick={login}>
          <LogIn aria-hidden />
          {labels.signIn[locale]}
        </MaterialButton>
      </div>
    );
  }
  return <EmptyState text={messages[kind][locale]} />;
};
