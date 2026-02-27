'use client';

import { useField } from '@payloadcms/ui';
import React, { useRef } from 'react';

export const EmailPreviewField: React.FC<{
  path: string;
  label?: Record<string, string> | string;
}> = ({ path, label }) => {
  const { value } = useField<string | null | undefined>({ path });
  const iframeReference = useRef<HTMLIFrameElement>(null);

  // We are not using a dynamic resize effect here.
  // Because sandbox="" makes the iframe cross-origin, reading the height from the parent throws a DOMSecurityError.
  // Instead, the container just relies on a large min-height and allows the user to scroll inside if needed.

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
      <div className="mt-1 min-h-[600px] overflow-hidden rounded border border-gray-200 bg-white dark:border-gray-800">
        {/* We use an empty sandbox="" to securely isolate the rendered email content completely, stripping it of the parent's origin. */}
        <iframe
          ref={iframeReference}
          srcDoc={value}
          className="h-full min-h-[600px] w-full border-none"
          sandbox=""
          title="Email Preview"
        />
      </div>
    </div>
  );
};

export default EmailPreviewField;
