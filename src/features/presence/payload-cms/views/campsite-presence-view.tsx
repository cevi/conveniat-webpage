'use client';

import { TRPCProvider, trpc } from '@/trpc/client';
import { useLocale } from '@payloadcms/ui';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

interface TranslationSet {
  title: string;
  searchPlaceholder: string;
  noUsers: string;
  name: string;
  actions: string;
  viewProfile: string;
  prev: string;
  next: string;
  loading: string;
  countText: (count: number) => string;
  pageInfo: (current: number, total: number) => string;
}

const translations: Record<'de' | 'fr' | 'en', TranslationSet> = {
  de: {
    title: 'Personen auf dem Lagerplatz',
    searchPlaceholder: 'Nach Name suchen...',
    noUsers: 'Keine Personen auf dem Lagerplatz gefunden.',
    name: 'Name',
    actions: 'Aktionen',
    viewProfile: 'Profil anzeigen',
    prev: 'Zurück',
    next: 'Weiter',
    loading: 'Lädt...',
    countText: (count: number): string => `Aktuell ${count} Personen anwesend`,
    pageInfo: (current: number, total: number): string => `Seite ${current} von ${total}`,
  },
  fr: {
    title: 'Présence sur le terrain de camp',
    searchPlaceholder: 'Rechercher par nom...',
    noUsers: 'Aucune personne trouvée sur le terrain de camp.',
    name: 'Nom',
    actions: 'Actions',
    viewProfile: 'Voir le profil',
    prev: 'Précédent',
    next: 'Suivant',
    loading: 'Chargement...',
    countText: (count: number): string => `${count} personnes actuellement présentes`,
    pageInfo: (current: number, total: number): string => `Page ${current} sur ${total}`,
  },
  en: {
    title: 'Campsite Presence',
    searchPlaceholder: 'Search by name...',
    noUsers: 'No users found on the campsite.',
    name: 'Name',
    actions: 'Actions',
    viewProfile: 'View Profile',
    prev: 'Previous',
    next: 'Next',
    loading: 'Loading...',
    countText: (count: number): string => `${count} users currently present`,
    pageInfo: (current: number, total: number): string => `Page ${current} of ${total}`,
  },
};

const CampsitePresenceViewInner: React.FC = () => {
  const { code: locale } = useLocale();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const currentLocale = locale === 'de' || locale === 'fr' ? locale : 'en';
  const t = translations[currentLocale];

  // Debounce search input to avoid excessive queries
  useEffect(() => {
    const handler = setTimeout((): void => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 300);

    return (): void => {
      clearTimeout(handler);
    };
  }, [search]);

  const { data, isLoading } = trpc.presence.listPresentUsers.useQuery({
    page,
    limit: 20,
    search: debouncedSearch,
  });

  // Render content area dynamically to avoid nested ternaries in JSX
  let contentArea: React.ReactNode;

  if (isLoading) {
    contentArea = (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(34, 139, 34, 0.2)',
            borderTopColor: '#228B22',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px auto',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span>{t.loading}</span>
      </div>
    );
  } else if (!data || data.users.length === 0) {
    contentArea = (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
        <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>{t.noUsers}</p>
      </div>
    );
  } else {
    contentArea = (
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  textTransform: 'uppercase',
                }}
              >
                {t.name}
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  textTransform: 'uppercase',
                  textAlign: 'right',
                }}
              >
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr
                key={user.uuid}
                style={{
                  borderBottom: '1px solid #F3F4F6',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(event_) => {
                  event_.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(event_) => {
                  event_.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td
                  style={{
                    padding: '14px 16px',
                    fontSize: '14px',
                    color: '#111827',
                    fontWeight: 500,
                  }}
                >
                  {user.name}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <Link
                    href={`/admin/collections/users/${user.uuid}`}
                    style={{
                      fontSize: '13px',
                      color: '#228B22',
                      textDecoration: 'none',
                      fontWeight: 600,
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(event_) => {
                      event_.currentTarget.style.color = '#1b6d1b';
                    }}
                    onMouseLeave={(event_) => {
                      event_.currentTarget.style.color = '#228B22';
                    }}
                  >
                    {t.viewProfile}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination footer */}
        {data.pageCount > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderTop: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
            }}
          >
            <button
              onClick={(): void => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: page === 1 ? '#F3F4F6' : '#FFFFFF',
                color: page === 1 ? '#9CA3AF' : '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={16} />
              {t.prev}
            </button>

            <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500 }}>
              {t.pageInfo(page, data.pageCount)}
            </span>

            <button
              onClick={(): void => setPage((p) => Math.min(data.pageCount, p + 1))}
              disabled={page === data.pageCount}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: page === data.pageCount ? '#F3F4F6' : '#FFFFFF',
                color: page === data.pageCount ? '#9CA3AF' : '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: page === data.pageCount ? 'not-allowed' : 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {t.next}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: 'rgba(34, 139, 34, 0.1)',
              color: '#228B22',
              padding: '8px',
              borderRadius: '8px',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
              {t.title}
            </h1>
            {data && (
              <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>
                {t.countText(data.totalCount)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
            }}
          />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(event_) => setSearch(event_.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(event_) => {
              event_.currentTarget.style.borderColor = '#228B22';
            }}
            onBlur={(event_) => {
              event_.currentTarget.style.borderColor = '#D1D5DB';
            }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {contentArea}
      </div>
    </div>
  );
};

export const CampsitePresenceView: React.FC = () => {
  return (
    <TRPCProvider>
      <CampsitePresenceViewInner />
    </TRPCProvider>
  );
};

export default CampsitePresenceView;
