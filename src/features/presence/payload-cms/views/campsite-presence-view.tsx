'use client';

import { TRPCProvider, trpc } from '@/trpc/client';
import { useLocale } from '@payloadcms/ui';
import { Calendar, Download, ExternalLink, Users } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

interface TranslationSet {
  title: string;
  countText: (count: number) => string;
  densityPlotTitle: string;
  downloadPlot: string;
  noPlotData: string;
  dateSettingsTitle: string;
  startDateLabel: string;
  endDateLabel: string;
  saveSettings: string;
  settingsSaved: string;
  saving: string;
  userListTitle: string;
  userListDescription: string;
  openUserList: string;
}

const translations: Record<'de' | 'fr' | 'en', TranslationSet> = {
  de: {
    title: 'Personen auf dem Lagerplatz',
    countText: (count: number): string => `Aktuell ${count} Personen anwesend`,
    densityPlotTitle: 'Anwesenheitsdichte & Spitzenzeiten',
    downloadPlot: 'Diagramm herunterladen',
    noPlotData: 'Nicht genügend Protokolldaten vorhanden, um ein Diagramm anzuzeigen.',
    dateSettingsTitle: 'Erfassungszeitraum festlegen',
    startDateLabel: 'Start-Datum',
    endDateLabel: 'End-Datum',
    saveSettings: 'Einstellungen speichern',
    settingsSaved: 'Einstellungen erfolgreich gespeichert!',
    saving: 'Speichert...',
    userListTitle: 'Anwesende Personen verwalten',
    userListDescription:
      'Öffnet die gefilterte Liste aller anwesenden Personen im standardmässigen Admin-Panel. Dort können Sie die Einträge suchen, sortieren, Spalten anpassen, CSV-Exporte erstellen oder Details bearbeiten.',
    openUserList: 'Personenliste öffnen',
  },
  fr: {
    title: 'Présence sur le terrain de camp',
    countText: (count: number): string => `${count} personnes actuellement présentes`,
    densityPlotTitle: 'Densité de présence (heures de pointe)',
    downloadPlot: 'Télécharger le graphique',
    noPlotData: 'Pas assez de données de journal pour afficher le graphique.',
    dateSettingsTitle: 'Définir la période de suivi',
    startDateLabel: 'Date de début',
    endDateLabel: 'Date de fin',
    saveSettings: 'Enregistrer les paramètres',
    settingsSaved: 'Paramètres enregistrés avec succès !',
    saving: 'Enregistrement...',
    userListTitle: 'Gérer les personnes présentes',
    userListDescription:
      "Ouvre la liste filtrée de toutes les personnes présentes dans le panneau d'administration par défaut. Vous pouvez y rechercher, trier, personnaliser les colonnes, exporter des fichiers CSV ou modifier les détails.",
    openUserList: 'Ouvrir la liste des personnes',
  },
  en: {
    title: 'Campsite Presence',
    countText: (count: number): string => `${count} users currently present`,
    densityPlotTitle: 'Campsite Presence Density (Peak Hours)',
    downloadPlot: 'Download Chart',
    noPlotData: 'Not enough log data to display density plot.',
    dateSettingsTitle: 'Set Tracking Period',
    startDateLabel: 'Start Date',
    endDateLabel: 'End Date',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved successfully!',
    saving: 'Saving...',
    userListTitle: 'Manage Present Users',
    userListDescription:
      'Opens the filtered list of all present users in the default admin panel. There you can search, sort, customize columns, export CSV files, or edit details.',
    openUserList: 'Open People List',
  },
};

const downloadSvg = (): void => {
  const svgElement = document.querySelector('#presence-density-chart');
  if (!svgElement) return;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = svgUrl;
  downloadLink.download = `campsite-presence-density-${new Date().toISOString().split('T')[0]}.svg`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
};

const CampsitePresenceViewInner: React.FC = () => {
  const { code: locale } = useLocale();

  // Date settings state
  const [startDateString, setStartDateString] = useState<string | undefined>();
  const [endDateString, setEndDateString] = useState<string | undefined>();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentLocale = locale === 'de' || locale === 'fr' ? locale : 'en';
  const t = translations[currentLocale];

  // Fetch present users count (using page size 1 to optimize loading speed)
  const { data: listData } = trpc.presence.listPresentUsers.useQuery({
    page: 1,
    limit: 1,
  });

  // Fetch density data logs
  const { data: densityData } = trpc.presence.getPresenceDensityData.useQuery();

  // Fetch tracking period dates
  const { data: dateData } = trpc.presence.getCampsitePresenceDates.useQuery();

  // Save settings mutation
  const updateDatesMutation = trpc.presence.updateCampsitePresenceDates.useMutation({
    onSuccess: (): void => {
      setSaveSuccess(true);
      setTimeout((): void => setSaveSuccess(false), 3000);
    },
  });

  const handleSaveDates = (event_: React.FormEvent): void => {
    event_.preventDefault();
    let finalStartDate: string | undefined;
    if (startDateString !== undefined) {
      finalStartDate = startDateString;
    } else if (dateData?.startDate) {
      finalStartDate = dateData.startDate.split('T')[0];
    }

    let finalEndDate: string | undefined;
    if (endDateString !== undefined) {
      finalEndDate = endDateString;
    } else if (dateData?.endDate) {
      finalEndDate = dateData.endDate.split('T')[0];
    }

    updateDatesMutation.mutate({
      startDate: finalStartDate ? new Date(finalStartDate).toISOString() : undefined,
      endDate: finalEndDate ? new Date(finalEndDate).toISOString() : undefined,
    });
  };

  // Math coordinates for SVG Chart
  const width = 800;
  const height = 280;
  const paddingX = 55;
  const paddingY = 30;

  const chartWidth = width - 2 * paddingX;
  const chartHeight = height - 2 * paddingY;

  const densityLogs = densityData || [];

  let linePath = '';
  let areaPath = '';
  const xLabels: { x: number; label: string }[] = [];
  const yGridLines: { y: number; label: string }[] = [];

  if (densityLogs.length >= 2) {
    const times = densityLogs.map((d) => new Date(d.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;

    const counts = densityLogs.map((d) => d.count);
    const maxCount = Math.max(...counts, 5); // Ensure scale goes up to at least 5

    const points = densityLogs.map((d) => {
      const tValue = new Date(d.timestamp).getTime();
      const x = paddingX + ((tValue - minTime) / timeRange) * chartWidth;
      const y = height - paddingY - (d.count / maxCount) * chartHeight;
      return { x, y, timestamp: d.timestamp };
    });

    const firstPoint = points[0];
    const lastPoint = points.at(-1);

    if (firstPoint && lastPoint) {
      linePath =
        `M ${firstPoint.x} ${firstPoint.y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ');
      areaPath = `${linePath} L ${lastPoint.x} ${height - paddingY} L ${firstPoint.x} ${height - paddingY} Z`;
    }

    // Generate Y axis grid lines (4 lines total)
    for (let index = 0; index <= 4; index++) {
      const ratio = index / 4;
      const countValue = Math.round(ratio * maxCount);
      const y = height - paddingY - ratio * chartHeight;
      yGridLines.push({ y, label: String(countValue) });
    }

    // Generate X axis labels (up to 5 labels spread across)
    const labelIndices = [
      0,
      Math.floor(points.length / 4),
      Math.floor(points.length / 2),
      Math.floor((3 * points.length) / 4),
      points.length - 1,
    ];
    const uniqueIndices = [...new Set(labelIndices)];
    for (const index of uniqueIndices) {
      if (index >= 0 && index < points.length) {
        const p = points[index];
        if (p) {
          const date = new Date(p.timestamp);
          const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          xLabels.push({ x: p.x, label: timeString });
        }
      }
    }
  }

  // Density Plot area
  const densityPlotArea =
    densityLogs.length < 2 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
        {t.noPlotData}
      </div>
    ) : (
      <div style={{ position: 'relative' }}>
        <svg
          id="presence-density-chart"
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#228B22" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#228B22" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yGridLines.map((line, index) => (
            <g key={index}>
              <line
                x1={paddingX}
                y1={line.y}
                x2={width - paddingX}
                y2={line.y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray={index === 0 ? '0' : '4 4'}
              />
              <text
                x={paddingX - 10}
                y={line.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9CA3AF"
                fontWeight="500"
              >
                {line.label}
              </text>
            </g>
          ))}

          {/* Area under the line */}
          <path d={areaPath} fill="url(#gradient)" />

          {/* Line chart */}
          <path d={linePath} fill="none" stroke="#228B22" strokeWidth="3" strokeLinecap="round" />

          {/* X axis line */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#D1D5DB"
            strokeWidth="1"
          />

          {/* X labels */}
          {xLabels.map((lbl, index) => (
            <g key={index}>
              <line
                x1={lbl.x}
                y1={height - paddingY}
                x2={lbl.x}
                y2={height - paddingY + 5}
                stroke="#D1D5DB"
                strokeWidth="1"
              />
              <text
                x={lbl.x}
                y={height - paddingY + 20}
                textAnchor="middle"
                fontSize="10"
                fill="#9CA3AF"
                fontWeight="500"
              >
                {lbl.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );

  let displayStartDate = '';
  if (startDateString !== undefined) {
    displayStartDate = startDateString;
  } else if (dateData?.startDate) {
    displayStartDate = dateData.startDate.split('T')[0] ?? '';
  }

  let displayEndDate = '';
  if (endDateString !== undefined) {
    displayEndDate = endDateString;
  } else if (dateData?.endDate) {
    displayEndDate = dateData.endDate.split('T')[0] ?? '';
  }

  const presentCount = listData ? listData.totalCount : 0;

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
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>
              {t.countText(presentCount)}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Top Section: Density Plot & Date Settings */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          {/* Density Plot */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              flex: '2 1 600px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                {t.densityPlotTitle}
              </h2>
              {densityLogs.length >= 2 && (
                <button
                  onClick={downloadSvg}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(event_) => {
                    event_.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(event_) => {
                    event_.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <Download size={15} />
                  {t.downloadPlot}
                </button>
              )}
            </div>
            {densityPlotArea}
          </div>

          {/* Date Tracking Period Settings */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              flex: '1 1 300px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
            >
              <Calendar size={18} style={{ color: '#228B22' }} />
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                {t.dateSettingsTitle}
              </h2>
            </div>

            <form
              onSubmit={handleSaveDates}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}
            >
              <div>
                <label
                  htmlFor="startDateInput"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '6px',
                  }}
                >
                  {t.startDateLabel}
                </label>
                <input
                  id="startDateInput"
                  type="date"
                  value={displayStartDate}
                  onChange={(event_) => setStartDateString(event_.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="endDateInput"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '6px',
                  }}
                >
                  {t.endDateLabel}
                </label>
                <input
                  id="endDateInput"
                  type="date"
                  value={displayEndDate}
                  onChange={(event_) => setEndDateString(event_.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <button
                  type="submit"
                  disabled={updateDatesMutation.isPending}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: '#228B22',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: updateDatesMutation.isPending ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(event_) => {
                    if (!updateDatesMutation.isPending) {
                      event_.currentTarget.style.backgroundColor = '#1b6d1b';
                    }
                  }}
                  onMouseLeave={(event_) => {
                    if (!updateDatesMutation.isPending) {
                      event_.currentTarget.style.backgroundColor = '#228B22';
                    }
                  }}
                >
                  {updateDatesMutation.isPending ? t.saving : t.saveSettings}
                </button>
              </div>

              {saveSuccess && (
                <p
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: '13px',
                    color: '#10B981',
                    fontWeight: 500,
                    textAlign: 'center',
                  }}
                >
                  {t.settingsSaved}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* User List Redirect Card */}
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
          }}
        >
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {t.userListTitle}
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#4B5563',
                margin: '8px 0 0 0',
                lineHeight: '1.5',
              }}
            >
              {t.userListDescription}
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
              onMouseEnter={(event_) => {
                event_.currentTarget.style.backgroundColor = '#1b6d1b';
              }}
              onMouseLeave={(event_) => {
                event_.currentTarget.style.backgroundColor = '#228B22';
              }}
            >
              <ExternalLink size={18} />
              {t.openUserList}
            </Link>
          </div>
        </div>
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
