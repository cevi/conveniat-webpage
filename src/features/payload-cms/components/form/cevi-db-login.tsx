'use client';

import { SubheadingH3 } from '@/components/ui/typography/subheading-h3';
import {
  changeUserText,
  loggedInAsText,
  loginWithCeviDatabaseText,
} from '@/features/payload-cms/components/form/static-form-texts';
import { getFormStorageKey } from '@/features/payload-cms/components/form/utils/get-form-storage-key';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect } from 'react';
import type { FieldError, FieldErrorsImpl, FieldValues, Merge } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

interface CeviDatabaseLoginProperties {
  name: string;
  label?: string;
  saveField?: 'name' | 'uuid' | 'email' | 'nickname';
  fieldMapping?: { jwtField: string; formField: string }[];
  formId?: string;
  required?: boolean;
  currentStepIndex?: number;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<FieldValues>>;
}

const loginRequiredMessage: StaticTranslationString = {
  en: 'You must log in to proceed',
  de: 'Sie müssen sich anmelden, um fortzufahren',
  fr: 'Vous devez vous connecter pour continuer',
};

export const CeviDatabaseLogin: React.FC<CeviDatabaseLoginProperties> = ({
  name,
  label,
  required,
  saveField,
  fieldMapping,
  formId,
  currentStepIndex,
  error,
}) => {
  const { register, setValue, getValues } = useFormContext();
  const { data: session } = useSession();
  const currentLocale = useCurrentLocale(i18nConfig);
  const locale = (currentLocale ?? 'en') as Locale;

  const handleLogin = (): void => {
    const values = getValues();
    if (typeof formId === 'string' && formId !== '') {
      sessionStorage.setItem(getFormStorageKey(formId, 'state'), JSON.stringify(values));
      if (currentStepIndex !== undefined) {
        sessionStorage.setItem(getFormStorageKey(formId, 'step'), String(currentStepIndex));
      }
    }
    // Inform browser to replace the current history entry so the back button skips the login trigger
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (typeof globalThis !== 'undefined' && globalThis.history) {
      globalThis.history.replaceState(undefined, '', globalThis.location.href);
    }
    const callbackUrl = typeof globalThis === 'undefined' ? undefined : globalThis.location.href;
    const signInOptions: { callbackUrl?: string } = {};
    if (typeof callbackUrl === 'string' && callbackUrl !== '') {
      signInOptions.callbackUrl = callbackUrl;
    }
    void signIn('cevi-db', signInOptions);
  };

  const handleChangeUser = (): void => {
    const values = getValues();
    if (typeof formId === 'string' && formId !== '') {
      sessionStorage.setItem(getFormStorageKey(formId, 'state'), JSON.stringify(values));
      if (currentStepIndex !== undefined) {
        sessionStorage.setItem(getFormStorageKey(formId, 'step'), String(currentStepIndex));
      }
    }
    const callbackUrl = typeof globalThis === 'undefined' ? undefined : globalThis.location.href;
    const signInOptions: { callbackUrl?: string } = {};
    if (typeof callbackUrl === 'string' && callbackUrl !== '') {
      signInOptions.callbackUrl = callbackUrl;
    }
    void signOut({ redirect: false }).then(() => {
      void signIn('cevi-db', signInOptions);
    });
  };

  const fieldMappingString = fieldMapping ? JSON.stringify(fieldMapping) : undefined;

  useEffect(() => {
    if (session?.user) {
      let valueToSave: string | number | undefined | null;
      switch (saveField) {
        case 'uuid': {
          valueToSave = session.user.cevi_db_uuid ?? session.user.uuid;
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
      setValue(name, valueToSave ?? '', { shouldValidate: true });

      const parsedFieldMapping = fieldMappingString
        ? (JSON.parse(fieldMappingString) as { jwtField: string; formField: string }[])
        : undefined;

      if (parsedFieldMapping && parsedFieldMapping.length > 0) {
        let didPrefill = false;
        for (const { jwtField, formField } of parsedFieldMapping) {
          let jwtValue: string | number | null | undefined;
          switch (jwtField) {
            case 'name': {
              jwtValue = session.user.name;
              break;
            }
            case 'firstName': {
              jwtValue = session.user.firstName;
              break;
            }
            case 'lastName': {
              jwtValue = session.user.lastName;
              break;
            }
            case 'email': {
              jwtValue = session.user.email;
              break;
            }
            case 'nickname': {
              jwtValue = session.user.nickname;
              break;
            }
            case 'uuid': {
              jwtValue = session.user.uuid;
              break;
            }
            case 'cevi_db_uuid': {
              jwtValue = session.user.cevi_db_uuid;
              break;
            }
            default: {
              break;
            }
          }
          const jwtValueString =
            jwtValue !== undefined && jwtValue !== null ? String(jwtValue).trim() : '';

          if (jwtValueString.length > 0) {
            const currentValue = getValues(formField) as unknown;
            let currentValueString = '';
            if (typeof currentValue === 'string' || typeof currentValue === 'number') {
              currentValueString = String(currentValue).trim();
            } else if (currentValue !== undefined && currentValue !== null) {
              currentValueString = 'has_value';
            }

            if (currentValueString.length === 0) {
              setValue(formField, String(jwtValue), { shouldValidate: true });
              didPrefill = true;
            }
          }
        }

        if (didPrefill && typeof formId === 'string' && currentStepIndex !== undefined) {
          sessionStorage.setItem(
            getFormStorageKey(formId, 'prefill'),
            String(currentStepIndex + 1),
          );
        }
      }
    }
  }, [session, saveField, setValue, name, fieldMappingString, getValues, formId, currentStepIndex]);

  const errorMessage = error ? (error as FieldError).message : undefined;

  const nickname = session?.user.nickname;
  const hasNickname = typeof nickname === 'string' && nickname.length > 0;

  return (
    <div className="mb-6">
      {Boolean(label) && <SubheadingH3 className="mt-0 mb-2">{label}</SubheadingH3>}

      <div
        className={cn(
          'flex flex-col gap-4 rounded-lg border-2 bg-gray-50 p-4',
          errorMessage === undefined ? 'border-transparent' : 'border-red-500',
        )}
      >
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
              className="text-conveniat-green shrink-0 cursor-pointer text-sm font-medium hover:underline"
            >
              {changeUserText[locale]}
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleLogin}
              className={cn(
                'font-body relative flex cursor-pointer items-center justify-center rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:outline-none',
              )}
            >
              <span className="font-body text-center text-sm font-medium text-gray-500">
                {loginWithCeviDatabaseText[locale]}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden input to hold the actual value for form submission/validation */}
      <input
        type="hidden"
        {...register(name, {
          required: required === true ? loginRequiredMessage[locale] : false,
        })}
      />

      {Boolean(errorMessage) && <div className="mt-1 text-sm text-red-600">{errorMessage}</div>}
    </div>
  );
};
