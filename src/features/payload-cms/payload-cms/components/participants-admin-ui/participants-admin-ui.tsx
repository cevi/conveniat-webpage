'use client';

import { useDocumentInfo } from '@payloadcms/ui';
import React, { useEffect, useState } from 'react';

type Participant = {
  uuid: string;
  fullName: string;
  nickname: string;
  hof: string;
  quartier: string;
};

export const ParticipantsAdminUI: React.FC = () => {
  const { id, collectionSlug } = useDocumentInfo();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !collectionSlug) {
      setLoading(false);
      return;
    }

    const fetchParticipants = async () => {
      try {
        const res = await fetch(`/api/${collectionSlug}/${id}/participants-export?format=json`);
        if (!res.ok) {
          throw new Error('Failed to fetch participants');
        }
        const data = await res.json();
        setParticipants(data.participants || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchParticipants();
  }, [id, collectionSlug]);

  if (!id) {
    return null;
  }

  return (
    <div className="field-type" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      <header
        className="field-type__header"
        style={{
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <h3 className="field-type__label" style={{ fontSize: '1.25rem', margin: 0 }}>
            Enrolled Participants
          </h3>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem' }}>
            Users who have enrolled for this module.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={`/api/${collectionSlug}/${id}/participants-export?format=csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--style-secondary btn--size-small"
          >
            Download CSV
          </a>
          <a
            href={`/api/${collectionSlug}/${id}/participants-export?format=xlsx`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--style-secondary btn--size-small"
          >
            Download Excel
          </a>
          <a
            href={`/api/${collectionSlug}/${id}/participants-export?format=pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--style-primary btn--size-small"
          >
            Download PDF
          </a>
        </div>
      </header>

      <div
        style={{
          background: 'var(--theme-elevation-50)',
          padding: '1rem',
          borderRadius: '4px',
          border: '1px solid var(--theme-elevation-150)',
        }}
      >
        {loading && <p>Loading participants...</p>}
        {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
        {!loading && !error && participants.length === 0 && (
          <p style={{ margin: 0 }}>No participants enrolled yet.</p>
        )}
        {!loading && !error && participants.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)' }}>
                  <th style={{ padding: '0.5rem' }}>Name</th>
                  <th style={{ padding: '0.5rem' }}>Ceviname</th>
                  <th style={{ padding: '0.5rem' }}>Email</th>
                  <th style={{ padding: '0.5rem' }}>Hof</th>
                  <th style={{ padding: '0.5rem' }}>Quartier</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.uuid} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                    <td style={{ padding: '0.5rem' }}>{p.fullName}</td>
                    <td style={{ padding: '0.5rem' }}>{p.nickname}</td>
                    <td style={{ padding: '0.5rem' }}>{p.email}</td>
                    <td style={{ padding: '0.5rem' }}>{p.hof}</td>
                    <td style={{ padding: '0.5rem' }}>{p.quartier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantsAdminUI;
