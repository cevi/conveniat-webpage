/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';

export default function PdfReportGeneratorUI(): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(true);

  useEffect(() => {
    if (open && forms.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingForms(true);
      fetch('/api/forms?limit=100&locale=all')
        .then((response) => response.json())
        .then((data) => {
          setForms(data.docs ?? []);
          setLoadingForms(false);
        })
        .catch(() => setLoadingForms(false));
    }
  }, [open, forms.length]);

  useEffect(() => {
    if (selectedFormId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingFields(true);
      fetch(`/api/form-submissions?where[form][equals]=${selectedFormId}&limit=1`)
        .then((response) => response.json())
        .then((data) => {
          if (Array.isArray(data.docs) && data.docs.length > 0) {
            const sub = data.docs[0];
            if (sub !== null && sub !== undefined && Array.isArray(sub.submissionData)) {
              const fields = sub.submissionData.map((d: any) => d.field);
              setAvailableFields(fields);
              const defaults = [
                'firstName',
                'lastName',
                'vorname',
                'name',
                'email',
                'phone',
                'cevi',
              ];
              setSelectedFields(
                fields.filter((f: string) => defaults.some((d) => f.toLowerCase().includes(d))),
              );
            } else {
              setAvailableFields([]);
            }
          } else {
            setAvailableFields([]);
          }
          setLoadingFields(false);
        })
        .catch(() => setLoadingFields(false));
    } else {
      setAvailableFields([]);
      setSelectedFields([]);
    }
  }, [selectedFormId]);

  const handleGenerate = (): void => {
    if (selectedFormId.length === 0) return;
    const query = new URLSearchParams();
    query.set('formId', selectedFormId);
    query.set('includeDetails', includeDetails ? 'true' : 'false');
    if (selectedFields.length > 0) {
      query.set('fields', selectedFields.join(','));
    }
    window.open(`/api/helper-jobs/report/pdf?${query.toString()}`, '_blank');
    setOpen(false);
  };

  const toggleField = (f: string): void => {
    setSelectedFields((previous) =>
      previous.includes(f) ? previous.filter((x) => x !== f) : [...previous, f],
    );
  };

  return (
    <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="btn btn--style-primary btn--size-medium"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            PDF Report Generieren
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
            }}
          />
          <Dialog.Content
            style={{
              backgroundColor: 'var(--theme-elevation-50)',
              padding: '2rem',
              borderRadius: '8px',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10_000,
              minWidth: '400px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              color: 'var(--theme-text)',
              border: '1px solid var(--theme-elevation-150)',
            }}
          >
            <Dialog.Title style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600 }}>
              Helfer PDF Report Konfigurieren
            </Dialog.Title>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="form-select"
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
              >
                Formular auswählen
              </label>
              {loadingForms ? (
                <p>Lade Formulare...</p>
              ) : (
                <select
                  id="form-select"
                  value={selectedFormId}
                  onChange={(event) => setSelectedFormId(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--theme-elevation-100)',
                    color: 'var(--theme-text)',
                  }}
                >
                  <option value="">-- Bitte wählen --</option>
                  {forms.map((f) => {
                    let displayName = f.id;
                    if (f.title) {
                      if (typeof f.title === 'string') {
                        displayName = f.title;
                      } else if (typeof f.title === 'object') {
                        displayName = f.title.de ?? f.title.en ?? f.title.fr ?? f.id;
                      }
                    }
                    if (!displayName || displayName === '') displayName = f.id;

                    return (
                      <option key={f.id} value={f.id}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {selectedFormId.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeDetails}
                    onChange={(event_) => setIncludeDetails(event_.target.checked)}
                  />
                  Helferdetails pro Ressort anhängen
                </label>
              </div>
            )}

            {includeDetails && selectedFormId.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Felder für &apos;Kontakt Details&apos; auswählen
                </label>
                {loadingFields && <p>Lade Felder...</p>}
                {!loadingFields && availableFields.length === 0 && (
                  <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                    Keine Felder gefunden (Bisher keine Anmeldungen für dieses Formular, weshalb das
                    PDF-Schema nicht geladen werden konnte).
                  </p>
                )}
                {!loadingFields && availableFields.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      background: 'var(--theme-elevation-100)',
                      padding: '1rem',
                      borderRadius: '4px',
                    }}
                  >
                    {availableFields.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          id={`field-chk-${f}`}
                          type="checkbox"
                          checked={selectedFields.includes(f)}
                          onChange={() => toggleField(f)}
                        />
                        <label htmlFor={`field-chk-${f}`}>{f}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                marginTop: '1.5rem',
              }}
            >
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn btn--style-secondary"
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--theme-elevation-150)',
                    borderRadius: '4px',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--theme-text)',
                  }}
                >
                  Abbrechen
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={selectedFormId.length === 0}
                className="btn btn--style-primary"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: selectedFormId.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedFormId.length > 0 ? 1 : 0.5,
                  border: 'none',
                }}
              >
                PDF Generieren
              </button>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--theme-text)',
                }}
              >
                ×
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
