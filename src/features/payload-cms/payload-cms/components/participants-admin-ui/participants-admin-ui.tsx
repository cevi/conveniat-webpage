'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { useDocumentInfo, useTranslation } from '@payloadcms/ui';
import React, { useCallback, useEffect, useState } from 'react';
import Select from 'react-select';

const texts = {
  title: { de: 'Angemeldete Personen', en: 'Enrolled participants', fr: 'Personnes inscrites' },
  description: {
    de: 'Wer sich für diesen Eintrag angemeldet hat.',
    en: 'Who has enrolled for this entry.',
    fr: 'Qui s’est inscrit à cette entrée.',
  },
  downloadCsv: { de: 'CSV herunterladen', en: 'Download CSV', fr: 'Télécharger CSV' },
  downloadExcel: { de: 'Excel herunterladen', en: 'Download Excel', fr: 'Télécharger Excel' },
  downloadPdf: { de: 'PDF herunterladen', en: 'Download PDF', fr: 'Télécharger PDF' },
  loading: {
    de: 'Angemeldete Personen werden geladen…',
    en: 'Loading participants…',
    fr: 'Chargement des personnes inscrites…',
  },
  empty: {
    de: 'Noch niemand angemeldet.',
    en: 'No participants enrolled yet.',
    fr: 'Personne n’est encore inscrit.',
  },
  name: { de: 'Name', en: 'Name', fr: 'Nom' },
  nickname: { de: 'Ceviname', en: 'Ceviname', fr: 'Nom Cevi' },
  email: { de: 'E-Mail', en: 'Email', fr: 'E-mail' },
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  quartier: { de: 'Quartier', en: 'Quartier', fr: 'Quartier' },
  actions: { de: 'Aktionen', en: 'Actions', fr: 'Actions' },
  remove: { de: 'Entfernen', en: 'Remove', fr: 'Retirer' },
  removeTitle: {
    de: 'Person abmelden',
    en: 'Unenroll this person',
    fr: 'Désinscrire cette personne',
  },
  confirmRemove: {
    de: 'Diese Person wirklich abmelden?',
    en: 'Really unenroll this person?',
    fr: 'Vraiment désinscrire cette personne ?',
  },
  manualTitle: { de: 'Von Hand anmelden', en: 'Enroll by hand', fr: 'Inscrire manuellement' },
  searchUser: { de: 'Person suchen…', en: 'Search person…', fr: 'Chercher une personne…' },
  enroll: { de: 'Anmelden', en: 'Enroll', fr: 'Inscrire' },
  enrolling: { de: 'Wird angemeldet…', en: 'Enrolling…', fr: 'Inscription…' },
  unknownName: { de: 'Unbekannt', en: 'Unknown', fr: 'Inconnu' },
  loadFailed: {
    de: 'Die angemeldeten Personen konnten nicht geladen werden.',
    en: 'The participants could not be loaded.',
    fr: 'Les personnes inscrites n’ont pas pu être chargées.',
  },
  enrollFailed: {
    de: 'Die Person konnte nicht angemeldet werden.',
    en: 'The person could not be enrolled.',
    fr: 'La personne n’a pas pu être inscrite.',
  },
  unenrollFailed: {
    de: 'Die Person konnte nicht abgemeldet werden.',
    en: 'The person could not be unenrolled.',
    fr: 'La personne n’a pas pu être désinscrite.',
  },
} satisfies Record<string, StaticTranslationString>;

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
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(id !== undefined && collectionSlug !== undefined);
  const [error, setError] = useState<string | undefined>();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | undefined>();
  const [mutating, setMutating] = useState<boolean>(false);
  const [hideHofAndQuartier, setHideHofAndQuartier] = useState<boolean>(false);

  const fetchParticipants = useCallback(async (): Promise<void> => {
    if (id == undefined || collectionSlug == undefined) {
      return;
    }
    try {
      const response = await fetch(`/api/${collectionSlug}/${id}/participants-export?format=json`);
      if (!response.ok) {
        throw new Error(texts.loadFailed[locale]);
      }
      const data = (await response.json()) as { participants?: Participant[] };
      setParticipants(data.participants ?? []);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      setLoading(false);
    }
  }, [id, collectionSlug, locale]);

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/users?limit=1000`);
      if (!response.ok) {
        throw new Error('Failed to fetch available users');
      }

      const data = (await response.json()) as { docs?: PayloadUserResponse[] };
      const options = (data.docs ?? []).map((u) => {
        const namePart = u.fullName ?? texts.unknownName[locale];
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
  }, [locale]);

  const fetchFeatureFlag = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/globals/app-feature-flags/`);
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }
      const data = (await response.json()) as { hideHofAndQuartier?: boolean };
      setHideHofAndQuartier(data.hideHofAndQuartier ?? false);
    } catch (error_) {
      console.warn('Error fetching feature flags, defaulting to false', error_);
      setHideHofAndQuartier(false);
    }
  }, []);

  useEffect(() => {
    if (id === undefined || collectionSlug === undefined) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchParticipants();
    void fetchUsers();
    void fetchFeatureFlag();
  }, [id, collectionSlug, fetchParticipants, fetchUsers, fetchFeatureFlag]);

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
        throw new Error(texts.enrollFailed[locale]);
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
    if (!confirm(texts.confirmRemove[locale])) return;

    setMutating(true);
    try {
      const response = await fetch(`/api/${collectionSlug}/${id}/participants?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(texts.unenrollFailed[locale]);
      }

      await fetchParticipants();
    } catch (error_) {
      alert(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      setMutating(false);
    }
  };

  if (id === undefined || collectionSlug === undefined) {
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
            {texts.title[locale]}
          </h3>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem' }}>
            {texts.description[locale]}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={`/api/${collectionSlug}/${id}/participants-export?format=csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--style-secondary btn--size-small"
          >
            {texts.downloadCsv[locale]}
          </a>
          <a
            href={`/api/${collectionSlug}/${id}/participants-export?format=xlsx`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--style-secondary btn--size-small"
          >
            {texts.downloadExcel[locale]}
          </a>
          <a
            href={`/api/${collectionSlug}/${id}/participants-export?format=pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--style-primary btn--size-small"
          >
            {texts.downloadPdf[locale]}
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
        {loading === true && <p>{texts.loading[locale]}</p>}
        {error !== undefined && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
        {loading === false && error === undefined && participants.length === 0 && (
          <p style={{ margin: 0, marginBottom: '1rem' }}>{texts.empty[locale]}</p>
        )}
        {loading === false && error === undefined && participants.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)' }}>
                  <th style={{ padding: '0.5rem' }}>{texts.name[locale]}</th>
                  <th style={{ padding: '0.5rem' }}>{texts.nickname[locale]}</th>
                  <th style={{ padding: '0.5rem' }}>{texts.email[locale]}</th>
                  {hideHofAndQuartier ? undefined : (
                    <>
                      <th style={{ padding: '0.5rem' }}>{texts.hof[locale]}</th>
                      <th style={{ padding: '0.5rem' }}>{texts.quartier[locale]}</th>
                    </>
                  )}
                  <th style={{ padding: '0.5rem', width: '80px' }}>{texts.actions[locale]}</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.uuid} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                    <td style={{ padding: '0.5rem' }}>{p.fullName}</td>
                    <td style={{ padding: '0.5rem' }}>{p.nickname}</td>
                    <td style={{ padding: '0.5rem' }}>{p.email}</td>
                    {hideHofAndQuartier ? undefined : (
                      <>
                        <td style={{ padding: '0.5rem' }}>{p.hof}</td>
                        <td style={{ padding: '0.5rem' }}>{p.quartier}</td>
                      </>
                    )}
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
                        title={texts.removeTitle[locale]}
                      >
                        ✕ {texts.remove[locale]}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--theme-elevation-150)', paddingTop: '1rem' }}>
          <h4 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>{texts.manualTitle[locale]}</h4>
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
                placeholder={texts.searchUser[locale]}
                isDisabled={loading || mutating}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    minHeight: '40px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--theme-elevation-50)',
                    borderColor: state.isFocused
                      ? 'var(--theme-elevation-300)'
                      : 'var(--theme-elevation-150)',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: 'var(--theme-elevation-200)',
                    },
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: 'var(--theme-elevation-800)',
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'var(--theme-elevation-800)',
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: 'var(--theme-elevation-400)',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: 'var(--theme-elevation-100)',
                    border: '1px solid var(--theme-elevation-150)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    zIndex: 50,
                  }),
                  option: (base, state) => {
                    let backgroundColor = 'transparent';
                    if (state.isSelected) {
                      backgroundColor = 'var(--theme-elevation-300)';
                    } else if (state.isFocused) {
                      backgroundColor = 'var(--theme-elevation-150)';
                    }
                    return {
                      ...base,
                      backgroundColor,
                      color: 'var(--theme-elevation-800)',
                      cursor: 'pointer',
                      '&:active': {
                        backgroundColor: 'var(--theme-elevation-200)',
                      },
                    };
                  },
                  dropdownIndicator: (base, state) => ({
                    ...base,
                    color: state.isFocused
                      ? 'var(--theme-elevation-800)'
                      : 'var(--theme-elevation-400)',
                    '&:hover': {
                      color: 'var(--theme-elevation-800)',
                    },
                  }),
                  clearIndicator: (base) => ({
                    ...base,
                    color: 'var(--theme-elevation-400)',
                    '&:hover': {
                      color: 'var(--theme-elevation-800)',
                    },
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
              {mutating ? texts.enrolling[locale] : texts.enroll[locale]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsAdminUI;
