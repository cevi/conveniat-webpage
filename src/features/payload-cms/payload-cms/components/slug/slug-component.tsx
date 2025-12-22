'use client';

import { formatSlug } from '@/features/payload-cms/payload-cms/components/slug/format-slug';
import type { CustomSlugComponentProperties } from '@/features/payload-cms/payload-cms/components/slug/types';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Locale, StaticTranslationString } from '@/types/types';
import { FieldLabel, TextInput, useField, useFormFields, useLocale } from '@payloadcms/ui';
import { Lock, Unlock } from 'lucide-react';
import type { TextFieldClientProps } from 'payload';
import React, { useCallback, useEffect, useState } from 'react';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/confirmation-modal';

const modalTitleString: StaticTranslationString = {
  en: 'Change URL Slug',
  de: 'URL-Slug ändern',
  fr: 'Modifier le slug URL',
};

const modalMessageString: StaticTranslationString = {
  en: 'Changing the slug is dangerous. It will change the URL and break any links already shared to this page. Do you want to continue?',
  de: 'Das Ändern des Slugs ist gefährlich. Es ändert die URL und macht bereits geteilte Links zu dieser Seite ungültig. Möchten Sie fortfahren?',
  fr: "Changer le slug est dangereux. Cela modifiera l'URL et brisera tous les liens déjà partagés vers cette page. Voulez-vous continuer?",
};

const confirmButtonString: StaticTranslationString = {
  en: 'Continue',
  de: 'Fortfahren',
  fr: 'Continuer',
};

const submittingTextString: StaticTranslationString = {
  en: 'Unlocking...',
  de: 'Entsperren...',
  fr: 'Déverrouillage...',
};

export const SlugComponent: React.FC<
  TextFieldClientProps & { collectionName: CustomSlugComponentProperties }
> = (properties) => {
  const { field, path, collectionName } = properties;
  const locale = useLocale();

  let collectionSlug = '';
  switch (locale.code) {
    case LOCALE.DE: {
      collectionSlug = collectionName.collectionSlugDE;

      break;
    }
    case LOCALE.EN: {
      collectionSlug = collectionName.collectionSlugEN;

      break;
    }
    case LOCALE.FR: {
      collectionSlug = collectionName.collectionSlugFR;

      break;
    }
    // No default
  }

  const { label } = field;
  const { value, setValue } = useField<string>({ path: path || 'seo.urlSlug' });

  const [checkboxValue, setCheckboxValue] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetFieldValue = useFormFields(([fields]) => {
    return fields[path || 'seo.urlSlug']?.value as string;
  });

  useEffect(() => {
    if (!checkboxValue) {
      if (targetFieldValue) {
        const formattedSlug = formatSlug(targetFieldValue);

        if (value !== formattedSlug) setValue(formattedSlug);
      } else {
        if (value !== '') setValue('');
      }
    }
  }, [targetFieldValue, checkboxValue, setValue, value]);

  const handleLock = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();

      if (checkboxValue) {
        // If locked, open confirmation modal
        setIsModalOpen(true);
      } else {
        // If unlocked, just lock it
        setCheckboxValue(true);
      }
    },
    [checkboxValue],
  );

  const handleConfirmUnlock = useCallback(() => {
    setIsSubmitting(true);
    // Simulate async operation if needed, or just unlock
    // For now we just mock a small delay for UX or resolve immediately
    setTimeout(() => {
      setCheckboxValue(false);
      setIsModalOpen(false);
      setIsSubmitting(false);
    }, 200);
  }, []);

  const readOnly = checkboxValue;

  // TODO: this is wrong when a collection has multiple locale prefixes
  const prefix =
    `/${(locale.code as Locale) === LOCALE.DE ? '' : locale.code}/${collectionSlug}/`.replaceAll(
      /\/+/g,
      '/',
    );

  return (
    <div className="field-type slug-field-component space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={`field-${path}`} label={label ?? ''} />

        <button
          className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-hidden dark:text-gray-200 dark:hover:text-gray-50"
          onClick={handleLock}
          aria-label={checkboxValue ? 'Unlock' : 'Lock'}
        >
          {checkboxValue ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
        </button>
      </div>

      <div className="mb-2 text-sm text-gray-500">
        {prefix}
        <span className="text-gray-700">{value}</span>
      </div>
      <TextInput
        value={value}
        onChange={setValue}
        path={path || field.name}
        readOnly={Boolean(readOnly)}
        className=""
      />

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmUnlock}
        message={modalMessageString[locale.code as Locale] ?? modalMessageString.en}
        isSubmitting={isSubmitting}
        locale={locale.code as Locale}
        title={modalTitleString[locale.code as Locale] ?? modalTitleString.en}
        confirmLabel={confirmButtonString[locale.code as Locale] ?? confirmButtonString.en}
        submittingText={submittingTextString[locale.code as Locale] ?? submittingTextString.en}
        confirmVariant="danger"
      />
    </div>
  );
};
