'use client';

import { TRPCProvider, trpc } from '@/trpc/client';
import { useLocale } from '@payloadcms/ui';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

const OpenPeopleListFieldInner: React.FC = () => {
  const { code: locale } = useLocale();
  const currentLocale = locale === 'de' || locale === 'fr' ? locale : 'en';

  const translations = {
    de: {
      title: 'Anwesende Personen verwalten',
      countText: (count: number): string => `Aktuell ${count} Personen anwesend`,
      description:
        'Öffnet die gefilterte Liste aller anwesenden Personen im standardmässigen Admin-Panel. Dort können Sie die Einträge suchen, sortieren, Spalten anpassen, CSV-Exporte erstellen oder Details bearbeiten.',
      openUserList: 'Personenliste öffnen',
    },
    fr: {
      title: 'Gérer les personnes présentes',
      countText: (count: number): string => `${count} personnes actuellement présentes`,
      description:
        "Ouvre la liste filtrée de toutes les personnes présentes dans le panneau d'administration par défaut. Vous pouvez y rechercher, trier, personnaliser les colonnes, exporter des fichiers CSV ou modifier les détails.",
      openUserList: 'Ouvrir la liste des personnes',
    },
    en: {
      title: 'Manage Present Users',
      countText: (count: number): string => `${count} users currently present`,
      description:
        'Opens the filtered list of all present users in the default admin panel. There you can search, sort, customize columns, export CSV files, or edit details.',
      openUserList: 'Open People List',
    },
  };

  const t = translations[currentLocale];

  const { data: listData } = trpc.presence.listPresentUsers.useQuery({
    page: 1,
    limit: 1,
  });

  const presentCount = listData ? listData.totalCount : 0;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ flex: '1 1 400px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
          {t.title}
        </h2>
        <p style={{ fontSize: '14px', color: '#228B22', fontWeight: 600, margin: '4px 0' }}>
          {t.countText(presentCount)}
        </p>
        <p style={{ fontSize: '14px', color: '#4B5563', margin: '8px 0 0 0', lineHeight: '1.5' }}>
          {t.description}
        </p>
      </div>
      <div>
        <Link
          href="/admin/collections/users?where[presentAtCamp][equals]=true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '8px',
            backgroundColor: '#228B22',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: '600',
            textDecoration: 'none',
            transition: 'background-color 0.15s ease',
          }}
        >
          <ExternalLink size={18} />
          {t.openUserList}
        </Link>
      </div>
    </div>
  );
};

export const OpenPeopleListField: React.FC = () => {
  return (
    <TRPCProvider>
      <OpenPeopleListFieldInner />
    </TRPCProvider>
  );
};

export default OpenPeopleListField;
