'use client';

import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Custom Payload CMS field component that renders a button to dynamically sync/populate
 * all subevents of group 4337 directly from the Cevi.DB API.
 */
export const PopulateSubeventsButton: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePopulate = (): void => {
    const isConfirmed = globalThis.confirm(
      'Möchten Sie die Subgruppen-Anlässe aus Cevi.DB jetzt laden? Neue Anlässe werden der Liste hinzugefügt und bestehende Anlässe bleiben erhalten.',
    );
    if (isConfirmed === false) return;

    void (async (): Promise<void> => {
      try {
        setIsSubmitting(true);
        toast.info(
          'Starte Abfrage aller Untergruppen-Anlässe von Gruppe 4337. Dies kann bis zu einer Minute dauern...',
        );

        const response = await fetch('/api/confidential/billing/populate-subevents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          count?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? 'Verbindung zur Cevi.DB API fehlgeschlagen.');
        }

        if (data.success === true) {
          toast.success(
            `Erfolgreich befüllt! Es wurden ${String(data.count ?? 0)} Anlässe gefunden und gespeichert.`,
          );
          // Reload page to show the updated event list in the admin UI
          globalThis.location.reload();
        } else {
          toast.error(data.error ?? 'Fehler beim Befüllen der Anlässe.');
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.',
        );
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '6px',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>
        Anlässe automatisch aus Cevi.DB laden
      </h4>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
        Klicken Sie auf den Button unten, um alle Untergruppen der{' '}
        <a
          href="https://db.cevi.ch/groups/4337/events/simple?returning=true&year=2027"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0070f3', textDecoration: 'underline' }}
        >
          Hauptlager-Gruppe 4337
        </a>{' '}
        abzufragen. Es werden alle Anlässe mit dem Namen &quot;Hauptlager conveniat27&quot; oder
        &quot;conveniat27&quot; ermittelt und die Liste unten automatisch aktualisiert. Dieser
        Vorgang dauert ca. 45 Sekunden.
      </p>
      <button
        type="button"
        onClick={handlePopulate}
        disabled={isSubmitting}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          backgroundColor: isSubmitting ? '#a0aec0' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 4px rgba(0, 112, 243, 0.15)',
          transition: 'background-color 0.2s ease',
        }}
      >
        {isSubmitting ? 'Lade Anlässe aus Cevi.DB...' : 'Subgruppen-Anlässe jetzt laden'}
      </button>
    </div>
  );
};

export default PopulateSubeventsButton;
