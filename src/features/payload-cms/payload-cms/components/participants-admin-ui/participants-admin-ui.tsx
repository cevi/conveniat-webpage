'use client';

import { useDocumentInfo } from '@payloadcms/ui';
import React, { useCallback, useEffect, useState } from 'react';
import Select from 'react-select';

interface Participant {
  uuid: string;
  fullName: string;
  nickname: string;
  email: string;
  hof: string;
  quartier: string;
}

interface UserOption {
  value: string;
  label: string;
}

interface PayloadUserResponse {
  id: string;
  fullName?: string;
  nickname?: string;
}

export const ParticipantsAdminUI: React.FC = () => {
  const { id, collectionSlug } = useDocumentInfo();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(id !== undefined && collectionSlug !== undefined);
  const [error, setError] = useState<string | undefined>();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | undefined>();
  const [mutating, setMutating] = useState<boolean>(false);

  const fetchParticipants = useCallback(async (): Promise<void> => {
    if (id == undefined || collectionSlug == undefined) {
      return;
    }
    try {
      const response = await fetch(`/api/${collectionSlug}/${id}/participants-export?format=json`);
      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }
      const data = (await response.json()) as { participants?: Participant[] };
      setParticipants(data.participants ?? []);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      setLoading(false);
    }
  }, [id, collectionSlug]);

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/users?limit=1000`);
      if (!response.ok) {
        throw new Error('Failed to fetch available users');
      }

      const data = (await response.json()) as { docs?: PayloadUserResponse[] };
      const options = (data.docs ?? []).map((u) => {
        const namePart = u.fullName ?? 'Unbekannt';
        const nickPart = u.nickname !== undefined && u.nickname !== '' ? `(${u.nickname})` : '';
        return {
          value: u.id,
          label: `${namePart} ${nickPart}`,
        };
      });
      setUsers(options);
    } catch (error_) {
      console.warn('Could not load user list for manual enrollment.', error_);
    }
  }, []);

  useEffect(() => {
    if (id === undefined || collectionSlug === undefined) {
      return;
    }

    void fetchParticipants();
    void fetchUsers();
  }, [id, collectionSlug, fetchParticipants, fetchUsers]);

  const handleEnroll = async (): Promise<void> => {
    if (selectedUser === undefined || id === undefined || collectionSlug === undefined) return;

    setMutating(true);
    try {
      const response = await fetch(`/api/${collectionSlug}/${id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUser.value }),
      });

      if (!response.ok) {
        throw new Error('Failed to enroll user');
      }

      await fetchParticipants();
      setSelectedUser(undefined);
    } catch (error_) {
      alert(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      setMutating(false);
    }
  };

  const handleUnenroll = async (userId: string): Promise<void> => {
    if (id === undefined || collectionSlug === undefined) return;
    if (!confirm('Wirklich abmelden?')) return;

    setMutating(true);
    try {
      const response = await fetch(`/api/${collectionSlug}/${id}/participants?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to unenroll user');
      }

      await fetchParticipants();
    } catch (error_) {
      alert(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      setMutating(false);
    }
  };

  if (id === undefined || collectionSlug === undefined) {
    // eslint-disable-next-line unicorn/no-null
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
        {loading === true && <p>Loading participants...</p>}
        {error !== undefined && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
        {loading === false && error === undefined && participants.length === 0 && (
          <p style={{ margin: 0, marginBottom: '1rem' }}>No participants enrolled yet.</p>
        )}
        {loading === false && error === undefined && participants.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)' }}>
                  <th style={{ padding: '0.5rem' }}>Name</th>
                  <th style={{ padding: '0.5rem' }}>Ceviname</th>
                  <th style={{ padding: '0.5rem' }}>Email</th>
                  <th style={{ padding: '0.5rem' }}>Hof</th>
                  <th style={{ padding: '0.5rem' }}>Quartier</th>
                  <th style={{ padding: '0.5rem', width: '80px' }}>Actions</th>
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
                    <td style={{ padding: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={(): void => {
                          void handleUnenroll(p.uuid);
                        }}
                        disabled={mutating}
                        style={{
                          background: 'transparent',
                          color: 'var(--theme-error-500)',
                          border: 'none',
                          cursor: mutating ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                        }}
                        title="Un-enroll Participant"
                      >
                        ✕ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--theme-elevation-150)', paddingTop: '1rem' }}>
          <h4 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Manual Enrollment</h4>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1, maxWidth: '400px' }}>
              <Select
                options={users}
                value={selectedUser}
                onChange={(option): void => {
                  setSelectedUser((option as UserOption | undefined) ?? undefined);
                }}
                isClearable
                isSearchable
                placeholder="Search user..."
                isDisabled={loading || mutating}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '40px',
                    borderRadius: '4px',
                    borderColor: 'var(--theme-elevation-150)',
                  }),
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn--style-primary"
              onClick={(): void => {
                void handleEnroll();
              }}
              disabled={selectedUser === undefined || mutating}
              style={{ minHeight: '40px' }}
            >
              {mutating ? 'Enrolling...' : 'Enroll User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsAdminUI;
