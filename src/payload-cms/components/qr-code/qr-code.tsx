'use client';

import { FormSubmit, useDocumentInfo, useLocale } from '@payloadcms/ui';
import React, { useCallback, useState } from 'react';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import { CollectionSlug } from 'payload';
import { Locale } from '@/types';

const QRCode: React.FC = () => {
  const { collectionSlug, savedDocumentData } = useDocumentInfo();
  const [imageData, setImageData] = useState('');

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

    const fullURL = domain + '/' + locale + finalCollectionSlug + finalUrlSlug;

    // make a fetch call to fetch the QR code.
    fetch('https://backend.qr.cevi.tools/png', {
      method: 'POST', // Assuming this is a POST request
      headers: {
        'Content-Type': 'application/json', // Specify the content type
      },
      body: JSON.stringify({ text: fullURL }), // Convert data to JSON string
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

  return (
    <div>
      <div>
        <FormSubmit
          className=""
          buttonId="generate-qr"
          disabled={!isPublished}
          onClick={() => generateQR()}
          size="medium"
          type="button"
        >
          Generate QR Code for {locale}
        </FormSubmit>
      </div>
      {imageData && <img src={imageData} height="100" width="100" />}
    </div>
  );
};

export default QRCode;
