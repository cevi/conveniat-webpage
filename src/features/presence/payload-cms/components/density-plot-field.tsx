'use client';

import { TRPCProvider, trpc } from '@/trpc/client';
import { useLocale } from '@payloadcms/ui';
import { Download } from 'lucide-react';
import React from 'react';

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

const DensityPlotFieldInner: React.FC = () => {
  const { code: locale } = useLocale();
  const currentLocale = locale === 'de' || locale === 'fr' ? locale : 'en';

  const translations = {
    de: {
      title: 'Anwesenheitsdichte & Spitzenzeiten',
      downloadPlot: 'Diagramm herunterladen',
      noPlotData: 'Nicht genügend Protokolldaten vorhanden, um ein Diagramm anzuzeigen.',
    },
    fr: {
      title: 'Densité de présence (heures de pointe)',
      downloadPlot: 'Télécharger le graphique',
      noPlotData: 'Pas assez de données de journal pour afficher le graphique.',
    },
    en: {
      title: 'Campsite Presence Density (Peak Hours)',
      downloadPlot: 'Download Chart',
      noPlotData: 'Not enough log data to display density plot.',
    },
  };

  const t = translations[currentLocale];
  const { data: densityData } = trpc.presence.getPresenceDensityData.useQuery();
  const densityLogs = densityData || [];

  const width = 800;
  const height = 280;
  const paddingX = 55;
  const paddingY = 30;

  const chartWidth = width - 2 * paddingX;
  const chartHeight = height - 2 * paddingY;

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
    const maxCount = Math.max(...counts, 5);

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

    for (let index = 0; index <= 4; index++) {
      const ratio = index / 4;
      const countValue = Math.round(ratio * maxCount);
      const y = height - paddingY - ratio * chartHeight;
      yGridLines.push({ y, label: String(countValue) });
    }

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

  const chartArea =
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

          <path d={areaPath} fill="url(#gradient)" />
          <path d={linePath} fill="none" stroke="#228B22" strokeWidth="3" strokeLinecap="round" />

          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#D1D5DB"
            strokeWidth="1"
          />

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

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        marginBottom: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
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
          {t.title}
        </h2>
        {densityLogs.length >= 2 && (
          <button
            type="button"
            onClick={downloadSvg}
            style={{
              display: 'inline-flex',
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
          >
            <Download size={15} />
            {t.downloadPlot}
          </button>
        )}
      </div>
      {chartArea}
    </div>
  );
};

export const DensityPlotField: React.FC = () => {
  return (
    <TRPCProvider>
      <DensityPlotFieldInner />
    </TRPCProvider>
  );
};

export default DensityPlotField;
