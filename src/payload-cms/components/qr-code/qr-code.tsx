'use client';

import { FormSubmit, useDocumentInfo, useLocale } from '@payloadcms/ui';
import React, { MouseEventHandler, useCallback, useState } from 'react';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import { CollectionSlug } from 'payload';
import { Locale } from '@/types';
import { generatePreviewToken } from '@/utils/preview-token';
import { Check, Copy } from 'lucide-react';
import Image from 'next/image';

const QRCode: React.FC = () => {
  const { collectionSlug, savedDocumentData } = useDocumentInfo();
  const [imageData, setImageData] = useState('');
  const [fullURL, setFullURL] = useState('');

  const { code: locale } = useLocale();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const isPublished = savedDocumentData?.['_localized_status']?.['published'] || false;
  const generateQR = useCallback(async () => {
    const path = await serverSideSlugToUrlResolution(
      collectionSlug as CollectionSlug,
      locale as Locale,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const urlSlug: string = savedDocumentData?.['seo']?.['urlSlug'] || '';
    const finalCollectionSlug: string = path ? `/${path}` : '';
    const finalUrlSlug: string = urlSlug.startsWith('/') ? urlSlug : `/${urlSlug || ''}`;

    // TODO: fix this instead of using hard-coded domain
    const domain = process.env['NEXT_PUBLIC_APP_HOST_URL']
      ? String(process.env['NEXT_PUBLIC_APP_HOST_URL'])
      : 'https://conveniat27.ch';

    const fullURLForToken = domain + '/' + locale + finalCollectionSlug + finalUrlSlug;

    const previewToken = await generatePreviewToken(
      '/' + locale + finalCollectionSlug + finalUrlSlug,
    ).catch(console.error);
    const previewTokenURL = '?preview=true&preview-token=' + previewToken;

    setFullURL(fullURLForToken + previewTokenURL);
    // make a fetch call to fetch the QR code.
    fetch('https://backend.qr.cevi.tools/png', {
      method: 'POST', // Assuming this is a POST request
      headers: {
        'Content-Type': 'application/json', // Specify the content type
      },
      body: JSON.stringify({ text: fullURLForToken + previewTokenURL }), // Convert data to JSON string
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob(); // If the response is a file (like PNG), return it as a blob
      })
      .then((blob) => {
        // fix blob mime-type
        const fixedBlob = new Blob([blob], { type: 'image/png' });
        setImageData(URL.createObjectURL(fixedBlob));
      })
      .catch((error: unknown) => {
        console.error('Error:', error);
      });
  }, [savedDocumentData, collectionSlug, locale]);

  const [copied, setCopied] = useState(false);

  const handleCopy: MouseEventHandler<HTMLButtonElement> = (event): void => {
    navigator.clipboard
      .writeText(fullURL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(console.error);

    event.preventDefault();
  };

  return (
    <div>
      <div>
        <FormSubmit
          className=""
          buttonId="generate-qr"
          disabled={!Boolean(isPublished)}
          onClick={() => {
            generateQR().catch(console.error);
          }}
          size="medium"
          type="button"
        >
          Generate QR Code for {locale}
        </FormSubmit>
      </div>
      {imageData !== '' && (
        <div>
          <Image src={imageData} height="200" width="200" alt="link-qr-code" />

          <div className="relative mb-4 w-full max-w-[200px]">
            <input
              className="w-full rounded-md border border-solid border-gray-300 p-[4px] pr-10 text-sm shadow-none outline-none focus:ring-1"
              readOnly
              value={fullURL}
            />
            <button
              className="absolute right-1 top-0.5 m-0 h-7 w-7 -translate-y-1/2 cursor-pointer items-center rounded-md border border-solid border-gray-300 bg-gray-50 p-0 text-center"
              onClick={handleCopy}
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default QRCode;
