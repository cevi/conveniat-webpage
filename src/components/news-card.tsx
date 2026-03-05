import { LinkComponent } from '@/components/ui/link-component';
import { getJsxConverters } from '@/features/payload-cms/converters/richtext-lexical';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import ImageNode from 'next/image';
import type { ReactNode } from 'react';
import React from 'react';

export interface NewsCardType {
  children?: ReactNode;
  date: string;
  headline: string;
  linkField?: LinkFieldDataType;
  image?: Image;
  paragraph?: SerializedEditorState;
  locale: Locale;
  isSmall?: boolean;
}

export const NewsCardBlock: React.FC<NewsCardType> = ({
  children,
  date,
  headline,
  linkField,
  image,
  paragraph,
  locale,
  isSmall = false,
}) => {
  const newsCardContent = (
    <div
      className={cn(
        'flex basis-1 flex-col rounded-md border-2 border-gray-200 bg-white transition duration-200 hover:shadow-md',
        isSmall ? 'p-4 lg:max-w-64' : 'p-6 lg:max-w-96',
      )}
    >
      <div>
        <span
          className={cn(
            'font-body font-bold text-gray-500',
            isSmall ? 'text-[10px]' : 'text-[12px]',
          )}
        >
          {new Date(date).toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Europe/Zurich',
          })}
        </span>
        <h4
          className={cn(
            'font-heading text-conveniat-green mb-6 line-clamp-3 min-h-6 font-extrabold text-ellipsis',
            isSmall ? 'text-sm' : 'text-base',
          )}
        >
          {headline}
        </h4>
      </div>
      <div>
        <div className="">
          {image ? (
            <ImageNode
              className=""
              src={image.url ?? ''}
              alt={getImageAltInLocale(locale, image)}
              width={1200}
              height={800}
            />
          ) : (
            <></>
          )}
        </div>
        {paragraph ? (
          <RichText data={paragraph} converters={getJsxConverters(locale)}></RichText>
        ) : (
          <></>
        )}

        {children}
      </div>
    </div>
  );

  const url = getURLForLinkField(linkField, locale) ?? '';

  return linkField ? (
    <LinkComponent href={url} openInNewTab={openURLInNewTab(linkField)} hideExternalIcon>
      {newsCardContent}
    </LinkComponent>
  ) : (
    newsCardContent
  );
};
