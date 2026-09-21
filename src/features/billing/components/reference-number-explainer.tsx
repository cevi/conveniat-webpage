'use client';

import type { QrReferenceSegment } from '@/features/billing/utils';
import { describeQrReference, formatQrReference } from '@/features/billing/utils';
import React from 'react';

/** The same fictional participant the PDF preview below is generated for. */
const SAMPLE = {
  personId: '123456',
  eventId: '1234',
  participationId: '9012',
  counter: 1,
} as const;

/**
 * One colour per field. Mid-tones on purpose: they have to stay legible on the light and
 * the dark admin theme, and the same colours are reused on the printed form below to show
 * where each field ends up.
 */
const SEGMENT_COLORS: Record<QrReferenceSegment['key'], string> = {
  prefix: '#7F8C8D',
  personId: '#2E86C1',
  eventId: '#17A589',
  participationId: '#B7950B',
  counter: '#A569BD',
  checkDigit: '#CB4335',
};

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * Explains how a QR reference number is assembled, worked through on the same sample data
 * the PDF preview uses.
 *
 * The number is the one thing on the bill nobody can read at a glance: it is printed in
 * blocks of five, but it is *built* from fields of three, six, five, seven, five and one,
 * so the blocks cut across the fields and the structure is invisible. This lays both out
 * and colours them against each other.
 */
export const ReferenceNumberExplainer: React.FC = () => {
  const { reference, segments } = describeQrReference(
    SAMPLE.personId,
    SAMPLE.eventId,
    SAMPLE.participationId,
    SAMPLE.counter,
  );

  // Paint every digit of the finished reference with the colour of the field it came from,
  // so the printed grouping can be seen slicing through them.
  const colorPerDigit: string[] = segments.flatMap((segment) =>
    [...segment.digits].map(() => SEGMENT_COLORS[segment.key]),
  );

  const printedGroups = formatQrReference(reference).split(' ');
  let digitIndex = 0;

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        backgroundColor: 'var(--theme-elevation-50)',
        padding: '20px',
        marginBottom: '24px',
      }}
    >
      <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--theme-elevation-800)' }}>
        Aufbau der Referenznummer
      </h4>
      <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
        Die 27-stellige QR-Referenz wird aus festen Feldern zusammengesetzt. Jede Rechnung ist
        dadurch eindeutig einer Person, einem Anlass und einer Anmeldung zuzuordnen. Beispiel für{' '}
        <strong>Maximilian Muster</strong>:
      </p>

      {/* The fields, laid out at their true relative widths so it reads as one number. */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{ flexGrow: segment.digits.length, flexBasis: 0, minWidth: '52px' }}
          >
            <div
              style={{
                fontFamily: MONOSPACE,
                fontSize: '17px',
                letterSpacing: '1px',
                color: SEGMENT_COLORS[segment.key],
                whiteSpace: 'nowrap',
              }}
            >
              {segment.digits}
            </div>
            <div
              style={{
                height: '3px',
                borderRadius: '2px',
                margin: '5px 0 6px',
                backgroundColor: SEGMENT_COLORS[segment.key],
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--theme-elevation-800)' }}>
              {segment.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--theme-elevation-500)' }}>
              {segment.digits.length === 1
                ? '1 Stelle'
                : `${String(segment.digits.length)} Stellen`}
            </div>
          </div>
        ))}
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: '20px 0 0',
          padding: 0,
          display: 'grid',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--theme-elevation-600)',
        }}
      >
        {segments.map((segment) => (
          <li key={segment.key} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: SEGMENT_COLORS[segment.key],
              }}
            />
            <span>
              <strong style={{ color: 'var(--theme-elevation-800)' }}>{segment.label}</strong>{' '}
              {segment.source}
            </span>
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--theme-elevation-150)',
        }}
      >
        <div style={{ fontSize: '12px', color: 'var(--theme-elevation-600)', marginBottom: '6px' }}>
          So erscheint sie auf der Rechnung – in Fünfergruppen von rechts gelesen:
        </div>
        <div style={{ fontFamily: MONOSPACE, fontSize: '17px', letterSpacing: '1px' }}>
          {printedGroups.map((group, groupIndex) => (
            // eslint-disable-next-line react/no-array-index-key -- groups have no id but a fixed order
            <span key={groupIndex} style={{ marginRight: '10px' }}>
              {[...group].map((digit) => {
                const color = colorPerDigit[digitIndex] ?? 'var(--theme-elevation-800)';
                digitIndex += 1;
                return (
                  // eslint-disable-next-line react/no-array-index-key -- digits are positional
                  <span key={digitIndex} style={{ color }}>
                    {digit}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--theme-elevation-500)' }}>
          Die Fünfergruppen sind reine Darstellung und laufen quer zu den Feldern oben – deshalb
          lässt sich die Struktur an der gedruckten Nummer nicht ablesen.
        </p>
      </div>
    </div>
  );
};
