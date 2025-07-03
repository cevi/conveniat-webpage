import { LinkComponent } from '@/components/ui/link-component';
import { jsxConverters } from '@/features/payload-cms/converters/richtext-lexical';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image } from '@/features/payload-cms/payload-types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
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
}

export const NewsCardBlock: React.FC<NewsCardType> = async ({
  children,
  date,
  headline,
  linkField,
  image,
  paragraph,
}) => {
  const locale = await getLocaleFromCookies();

  const newscardContent = (
    <div className="flex basis-1 flex-col rounded-md border-2 border-gray-200 bg-white p-6 transition duration-200 hover:shadow-md lg:max-w-96">
      <div>
        <span className="font-body text-[12px] font-bold text-gray-500">
          {new Date(date).toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            /*hour: 'numeric',
            minute: 'numeric',*/
            timeZone: 'Europe/Zurich',
          })}
        </span>
        <h4 className="font-heading text-conveniat-green mb-6 line-clamp-3 min-h-[1.5rem] text-base font-extrabold text-ellipsis">
          {headline}
        </h4>
      </div>
      <div>
        <div className="">
          {image ? (
            <ImageNode
              className=""
              src={image.url ?? ''}
              alt={image.alt}
              width={1200}
              height={800}
            />
          ) : (
            <></>
          )}
        </div>
        {paragraph ? <RichText data={paragraph} converters={jsxConverters}></RichText> : <></>}

        {children}
      </div>
    </div>
  );

  const url = getURLForLinkField(linkField) ?? '';

  return linkField ? (
    <LinkComponent href={url} openInNewTab={openURLInNewTab(linkField)} hideExternalIcon>
      {newscardContent}
    </LinkComponent>
  ) : (
    newscardContent
  );
};
