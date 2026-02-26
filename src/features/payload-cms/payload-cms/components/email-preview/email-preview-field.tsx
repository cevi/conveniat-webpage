'use client';

import { useField } from '@payloadcms/ui';
import React, { useEffect, useRef } from 'react';

export const EmailPreviewField: React.FC<{
  path: string;
  label?: Record<string, string> | string;
}> = ({ path, label }) => {
  const { value } = useField<string | null | undefined>({ path });
  const iframeReference = useRef<HTMLIFrameElement>(null);

  // Resize iframe to fit content
  useEffect(() => {
    const iframe = iframeReference.current;
    if (!iframe) return;

    const setHeight = (): void => {
      if (iframe.contentWindow?.document.body) {
        // Add some padding to avoid scrollbars
        const scrollHeight = iframe.contentWindow.document.body.scrollHeight;
        if (scrollHeight > 0) {
          iframe.style.height = `${scrollHeight + 32}px`;
        }
      }
    };

    iframe.addEventListener('load', setHeight);

    // Also try to set it after a short delay in case load already fired
    setTimeout(setHeight, 100);

    return (): void => {
      iframe.removeEventListener('load', setHeight);
    };
  }, [value]);

  let labelText = 'Email Content';
  if (typeof label === 'string') {
    labelText = label;
  } else if (label !== undefined && typeof label === 'object') {
    if (typeof label['en'] === 'string') {
      labelText = label['en'];
    } else if (typeof label['de'] === 'string') {
      labelText = label['de'];
    }
  }

  if (value === null || value === undefined || value === '') {
    return (
      <div className="field-type custom-field mb-4">
        <label className="field-label">{labelText}</label>
        <div className="text-gray-500">No email content available</div>
      </div>
    );
  }

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">{labelText}</label>
      <div className="mt-1 min-h-[400px] rounded border border-gray-200 bg-white dark:border-gray-800">
        {/* We use sandbox="" to securely isolate the rendered email content. Even though it comes from our database, preventing any potential HTML injection attacks from executing scripts or other malicious behavior is a good security practice. */}
        <iframe
          ref={iframeReference}
          srcDoc={value}
          className="h-full min-h-[400px] w-full border-none"
          sandbox=""
          title="Email Preview"
        />
      </div>
    </div>
  );
};

export default EmailPreviewField;
