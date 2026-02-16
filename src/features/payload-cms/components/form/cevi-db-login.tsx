'use client';

import { SubheadingH3 } from '@/components/ui/typography/subheading-h3';
import type { FormBlockType } from '@/features/payload-cms/components/form';
import {
  changeUserText,
  loggedInAsText,
  loginWithCeviDatabaseText,
  skipLoginText,
  skippedText,
} from '@/features/payload-cms/components/form/static-form-texts';
import { i18nConfig, type Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

interface CeviDatabaseLoginProperties extends UseFormReturn {
  name: string;
  label?: string;
  skippable?: boolean;
  saveField?: 'name' | 'uuid' | 'email' | 'nickname';
  form: FormBlockType['form'];
  required?: boolean;
}

const handleLogin = (): void => {
  void signIn('cevi-db');
};

const handleChangeUser = (): void => {
  void signOut({ redirect: false }).then(() => {
    void signIn('cevi-db');
  });
};

export const CeviDatabaseLogin: React.FC<CeviDatabaseLoginProperties> = ({
  name,
  label,
  setValue,
  formState: { errors },
  required,
  skippable,
  saveField,
}) => {
  const { data: session } = useSession();
  const currentLocale = useCurrentLocale(i18nConfig);
  const locale = (currentLocale ?? 'en') as Locale;
  const [isSkipped, setIsSkipped] = useState(false);

  console.log('CeviDatabaseLogin render:', {
    session,
    status: session ? 'present' : 'missing',
    user: session?.user,
    locale,
  });

  useEffect(() => {
    if (session?.user) {
      let valueToSave: string | number | undefined | null;
      switch (saveField) {
        case 'uuid': {
          valueToSave = session.user.uuid;
          break;
        }
        case 'name': {
          valueToSave = session.user.name;
          break;
        }
        case 'nickname': {
          valueToSave = session.user.nickname;
          break;
        }
        default: {
          valueToSave = session.user.email;
          break;
        }
      }
      setValue(name, valueToSave, { shouldValidate: true });
    } else if (isSkipped) {
      setValue(name, '', { shouldValidate: true });
    }
  }, [session, saveField, setValue, name, isSkipped]);

  const errorMessage = errors[name]?.message as string | undefined;

  const isRequired = required === true;
  const isSkippable = skippable === true;
  const nickname = session?.user.nickname;
  const hasNickname = typeof nickname === 'string' && nickname.length > 0;

  const handleSkip = (): void => {
    setIsSkipped(true);
  };

  const handleLoginClick = (): void => {
    setIsSkipped(false);
    handleLogin();
  };

  return (
    <div className="mb-6">
      {Boolean(label) && <SubheadingH3 className="mt-0 mb-2">{label}</SubheadingH3>}

      <div className="flex flex-col gap-4 rounded-lg border-2 border-red-500 bg-gray-50 p-4">
        {session?.user ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-600">{loggedInAsText[locale]}:</p>
              <p className="font-semibold text-gray-900">
                {session.user.name ?? session.user.email}
                {hasNickname && ` (${nickname})`}
              </p>
              <p className="text-xs text-gray-500">{session.user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleChangeUser}
              className="text-conveniat-green shrink-0 text-sm font-medium hover:underline"
            >
              {changeUserText[locale]}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleLoginClick}
              className={cn(
                'font-body relative flex cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none',
                {
                  'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 focus:ring-green-600':
                    !isSkipped,
                  // If skipped is true, this button is NOT selected, so it looks standard.
                  // The login button essentially acts as a "select login" action.
                },
              )}
            >
              <span className="font-body text-center text-sm font-medium text-gray-500">
                {loginWithCeviDatabaseText[locale]}
              </span>
            </button>

            {isSkippable && (
              <button
                type="button"
                onClick={handleSkip}
                className={cn(
                  'font-body relative flex cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none',
                  {
                    'border-green-600 bg-green-50 text-green-700 ring-green-600': isSkipped,
                    'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 focus:ring-green-600':
                      !isSkipped,
                  },
                )}
              >
                <span className="font-body text-center text-sm font-medium text-gray-500">
                  {isSkipped ? skippedText[locale] : skipLoginText[locale]}
                </span>
                {isSkipped && (
                  <div
                    className={cn(
                      'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white',
                    )}
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            )}

            {isRequired && !isSkippable && !isSkipped && (
              <p className="col-span-full text-sm text-amber-700">{/* Optional warning */}</p>
            )}
          </div>
        )}
      </div>

      {/* Hidden input to hold the actual value for form submission/validation */}
      <input type="hidden" name={name} />

      {Boolean(errorMessage) && !isSkipped && (
        <div className="mt-1 text-sm text-red-600">{errorMessage}</div>
      )}
    </div>
  );
};
