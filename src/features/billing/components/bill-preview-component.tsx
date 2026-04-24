'use client';

import React from 'react';

/**
 * Custom Payload CMS component that renders an iframe showing a live preview
 * of the QR Bill PDF. The iframe loads the /api/confidential/billing/preview-pdf endpoint
 * which generates a sample bill using the current bill-settings values.
 */
export const BillPreviewComponent: React.FC = () => {
  const [iframeKey, setIframeKey] = React.useState(0);

  const handleRefresh = (): void => {
    setIframeKey((previous) => previous + 1);
  };

  return (
    <div style={{ padding: '0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          Vorschau für: <strong>Maximilian Muster v/o Musterli</strong> (fiktiver Teilnehmer)
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          style={{
            padding: '6px 16px',
            fontSize: '13px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Aktualisieren
        </button>
      </div>
      <iframe
        key={iframeKey}
        src={`/api/confidential/billing/preview-pdf?t=${String(iframeKey)}`}
        title="QR Bill Preview"
        style={{
          width: '100%',
          height: '800px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f5f5f5',
        }}
      />
    </div>
  );
};
