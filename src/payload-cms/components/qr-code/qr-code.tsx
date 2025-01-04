'use client';

import { FormSubmit, useDocumentInfo, useLocale } from '@payloadcms/ui';
import { useCallback, useState } from 'react';

const QRCode: React.FC = () => {
  const { collectionSlug, savedDocumentData } = useDocumentInfo();
  const [imageData, setImageData] = useState('');

  const { code: locale } = useLocale();

  const isPublished = savedDocumentData?.['_localized_status']?.['published'] || false;
  const generateQR = useCallback(() => {
    const urlSlug = savedDocumentData?.['seo']?.['urlSlug'];

    const finalCollectionSlug = collectionSlug ? `/${collectionSlug}` : '';
    const finalUrlSlug = urlSlug?.startsWith('/') ? urlSlug : `/${urlSlug || ''}`;
    const fullURL =
      process.env['NEXT_PUBLIC_APP_HOST_URL'] + '/' + locale + finalCollectionSlug + finalUrlSlug;

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
      .catch((error) => {
        console.error('Error:', error);
      });
  }, []);

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
