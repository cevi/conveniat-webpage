import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ShowForm } from '@/features/payload-cms/components/content-blocks/show-form';
import type { LocalizedCollectionPage, StaticTranslationString } from '@/types/types';
import config from '@payload-config';
import type { Form } from '@payloadcms/plugin-form-builder/types';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import React from 'react';
import type { FormBlockType } from 'src/features/payload-cms/components/form';

const pageTitle: StaticTranslationString = {
  en: 'Preview of a forms',
  de: 'Vorschau eines Formulars',
  fr: 'Aperçu d’une entrée de formulaire',
};

export const FormsPreviewPage: React.FC<LocalizedCollectionPage> = async ({
  slugs,
  locale,
  renderInPreviewMode,
}) => {
  if (!renderInPreviewMode) notFound();

  const uuid = slugs[0];
  const payload = await getPayload({ config });
  const form = await payload.find({
    collection: 'forms',
    locale: locale,
    draft: renderInPreviewMode,
    where: {
      id: { equals: uuid },
    },
  });

  if (form.docs.length === 0) return notFound();
  const formData = form.docs[0] as unknown as Form;

  const formBlock: FormBlockType = {
    blockType: 'formBlock',
    blockName: 'Form Block',
    form: { ...formData, _localized_status: { published: true } },
  };

  return (
    <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <HeadlineH1>{pageTitle[locale]}</HeadlineH1>
      <ShowForm {...formBlock} />
    </article>
  );
};
