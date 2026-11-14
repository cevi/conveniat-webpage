'use client';

import type {
  QuotaGrid,
  QuotaImport,
} from '@/features/payload-cms/payload-cms/endpoints/hof-shift-quota-endpoints';
import type {
  CampDay,
  QuotaChange,
} from '@/features/payload-cms/payload-cms/utils/hof-shift-quotas';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Banner, Button, toast } from '@payloadcms/ui';
import { Download, Save, TriangleAlert, Upload } from 'lucide-react';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';

const texts = {
  search: { de: 'Hof suchen', en: 'Search Hof', fr: 'Chercher un Hof' },
  allQuartiere: { de: 'Alle Quartiere', en: 'All Quartiere', fr: 'Tous les quartiers' },
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  quartier: { de: 'Quartier', en: 'Quartier', fr: 'Quartier' },
  total: { de: 'Total', en: 'Total', fr: 'Total' },
  sumQuotas: { de: 'Summe Kontingente', en: 'Sum of quotas', fr: 'Somme des quotas' },
  places: {
    de: 'Plätze in Schichteinsätzen',
    en: 'Places in shifts',
    fr: 'Places dans les services',
  },
  enrolled: {
    de: 'Davon angemeldet',
    en: 'Of which enrolled',
    fr: 'Dont inscrits',
  },
  unlimited: { de: 'offen', en: 'open', fr: 'ouvert' },
  tooFewPlaces: {
    de: 'An diesem Tag verlangen die Kontingente mehr Einsätze, als Plätze in Schichteinsätzen offen sind.',
    en: 'On this day the quotas ask for more shifts than there are places in the shifts.',
    fr: 'Ce jour-là, les quotas demandent plus de services qu’il n’y a de places.',
  },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  saved: { de: 'Kontingente gespeichert.', en: 'Quotas saved.', fr: 'Quotas enregistrés.' },
  saveFailed: {
    de: 'Die Kontingente konnten nicht gespeichert werden.',
    en: 'The quotas could not be saved.',
    fr: 'Les quotas n’ont pas pu être enregistrés.',
  },
  export: { de: 'Als Excel exportieren', en: 'Export as Excel', fr: 'Exporter en Excel' },
  import: { de: 'Excel importieren', en: 'Import Excel', fr: 'Importer un Excel' },
  importDone: {
    de: 'Excel eingelesen. Prüfe die markierten Zellen und speichere.',
    en: 'Workbook read. Check the marked cells and save.',
    fr: 'Fichier lu. Vérifie les cellules marquées et enregistre.',
  },
  importFailed: {
    de: 'Das Excel konnte nicht gelesen werden. Es braucht eine Spalte «Hof» und Tage wie in der Vorlage.',
    en: 'The workbook could not be read. It needs a column “Hof” and days as in the export.',
    fr: 'Le fichier n’a pas pu être lu. Il faut une colonne « Hof » et des jours comme dans l’export.',
  },
  unknownHoefe: {
    de: 'Diese Höfe aus dem Excel gibt es nicht:',
    en: 'These Höfe from the workbook do not exist:',
    fr: 'Ces Höfe du fichier n’existent pas :',
  },
  invalidCells: {
    de: 'Diese Zellen sind keine ganzen Zahlen und wurden übergangen:',
    en: 'These cells are not whole numbers and were skipped:',
    fr: 'Ces cellules ne sont pas des nombres entiers et ont été ignorées :',
  },
  unsaved: {
    de: 'Ungespeicherte Änderungen',
    en: 'Unsaved changes',
    fr: 'Modifications non enregistrées',
  },
  noDays: {
    de: 'Es gibt noch keine Schichteinsätze. Die Spalten sind die Tage, an denen es welche gibt.',
    en: 'There are no shifts yet. The columns are the days that have some.',
    fr: 'Il n’y a pas encore de services. Les colonnes sont les jours qui en ont.',
  },
} satisfies Record<string, StaticTranslationString>;

const cellKey = (hofId: string, day: CampDay): string => `${hofId} ${day}`;

const dayLabel = (locale: Locale, day: CampDay): string =>
  new Intl.DateTimeFormat(`${locale}-CH`, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));

/** A cell's text: what was typed, else the saved number, else empty. */
const parseSlots = (text: string): number | null | undefined => {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 && value <= 999 ? value : undefined;
};

/**
 * The grid of the Schicht-Kontingente: one row per Hof, one column per day with a Schichteinsatz.
 * Edits stay in the page until "Speichern"; an imported workbook lands here the same way, so the
 * Helferpool sees what it changes before it counts.
 */
export const HofShiftQuotaGrid: React.FC<{ initialGrid: QuotaGrid; locale: Locale }> = ({
  initialGrid,
  locale,
}) => {
  const [grid, setGrid] = useState(initialGrid);
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState('');
  const [quartier, setQuartier] = useState('');
  const [saving, setSaving] = useState(false);
  const [importProblems, setImportProblems] = useState<QuotaImport | undefined>();
  const fileInput = useRef<HTMLInputElement>(null);

  const quartiere = useMemo(
    () =>
      [
        ...new Set(grid.hoefe.flatMap((hof) => (hof.quartier === undefined ? [] : [hof.quartier]))),
      ].toSorted((a, b) => a.localeCompare(b, 'de')),
    [grid.hoefe],
  );

  const valueOf = (hofId: string, day: CampDay): number | null => {
    const edit = edits.get(cellKey(hofId, day));
    if (edit !== undefined) return parseSlots(edit) ?? null;
    return grid.quotas[hofId]?.[day] ?? null;
  };

  const visibleHoefe = grid.hoefe.filter(
    (hof) =>
      (quartier === '' || hof.quartier === quartier) &&
      hof.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const sumOfDay = (day: CampDay): number =>
    grid.hoefe.reduce((sum, hof) => sum + (valueOf(hof.id, day) ?? 0), 0);

  const changes: QuotaChange[] = [...edits].flatMap(([key, text]) => {
    const [hofId = '', day = ''] = key.split(' ');
    const slots = parseSlots(text);
    if (slots === undefined) return [];
    const saved = grid.quotas[hofId]?.[day] ?? null;
    return slots === saved ? [] : [{ hofId, day, slots }];
  });
  const hasInvalidEdit = [...edits.values()].some((text) => parseSlots(text) === undefined);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const response = await fetch('/api/helper-shifts/quotas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      if (!response.ok) throw new Error(`saving failed with ${String(response.status)}`);
      setGrid((await response.json()) as QuotaGrid);
      setEdits(new Map());
      setImportProblems(undefined);
      toast.success(texts.saved[locale]);
    } catch (error) {
      console.error('Saving the shift quotas failed', error);
      toast.error(texts.saveFailed[locale]);
    } finally {
      setSaving(false);
    }
  };

  const importWorkbook = async (file: File): Promise<void> => {
    try {
      const response = await fetch('/api/helper-shifts/quotas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: await file.arrayBuffer(),
      });
      if (!response.ok) throw new Error(`import failed with ${String(response.status)}`);
      const result = (await response.json()) as QuotaImport;
      setEdits((current) => {
        const next = new Map(current);
        for (const change of result.changes) {
          next.set(
            cellKey(change.hofId, change.day),
            change.slots === null ? '' : String(change.slots),
          );
        }
        return next;
      });
      setImportProblems(
        result.unknownHoefe.length + result.invalidCells.length > 0 ? result : undefined,
      );
      toast.info(texts.importDone[locale]);
    } catch (error) {
      console.error('Importing the shift quotas failed', error);
      toast.error(texts.importFailed[locale]);
    }
  };

  const cellClass = 'border-b border-(--theme-elevation-100) px-3 py-1.5';
  const headClass = cn(
    cellClass,
    'py-2.5 text-left font-semibold whitespace-nowrap text-(--theme-elevation-500)',
  );

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          placeholder={texts.search[locale]}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 w-64 rounded border border-(--theme-elevation-150) bg-(--theme-input-bg) px-3"
        />
        <select
          value={quartier}
          onChange={(event) => setQuartier(event.target.value)}
          className="h-10 rounded border border-(--theme-elevation-150) bg-(--theme-input-bg) px-3"
          aria-label={texts.quartier[locale]}
        >
          <option value="">{texts.allQuartiere[locale]}</option>
          {quartiere.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) void importWorkbook(file);
            event.target.value = '';
          }}
        />
        <Button
          buttonStyle="secondary"
          size="medium"
          margin={false}
          icon={<Upload className="h-4 w-4" />}
          iconPosition="left"
          onClick={() => fileInput.current?.click()}
        >
          {texts.import[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="medium"
          margin={false}
          el="anchor"
          url="/api/helper-shifts/quotas/export"
          newTab
          icon={<Download className="h-4 w-4" />}
          iconPosition="left"
        >
          {texts.export[locale]}
        </Button>
        <Button
          buttonStyle="primary"
          size="medium"
          margin={false}
          disabled={saving || changes.length === 0 || hasInvalidEdit}
          icon={<Save className="h-4 w-4" />}
          iconPosition="left"
          onClick={() => void save()}
        >
          {changes.length > 0
            ? `${texts.save[locale]} (${String(changes.length)})`
            : texts.save[locale]}
        </Button>
      </div>

      {importProblems !== undefined && (
        <Banner type="error">
          {importProblems.unknownHoefe.length > 0 && (
            <p className="m-0">
              {texts.unknownHoefe[locale]} {importProblems.unknownHoefe.join(', ')}
            </p>
          )}
          {importProblems.invalidCells.length > 0 && (
            <p className="m-0">
              {texts.invalidCells[locale]} {importProblems.invalidCells.join('; ')}
            </p>
          )}
        </Banner>
      )}

      {grid.days.length === 0 ? (
        <Banner type="info">{texts.noDays[locale]}</Banner>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-(--theme-elevation-0)">
            <thead>
              <tr>
                <th className={headClass}>{texts.hof[locale]}</th>
                <th className={headClass}>{texts.quartier[locale]}</th>
                {grid.days.map((day) => (
                  <th key={day} className={headClass}>
                    {dayLabel(locale, day)}
                  </th>
                ))}
                <th className={headClass}>{texts.total[locale]}</th>
              </tr>
            </thead>
            <tbody>
              {visibleHoefe.map((hof) => (
                <tr key={hof.id}>
                  <td className={cn(cellClass, 'font-semibold whitespace-nowrap')}>{hof.name}</td>
                  <td className={cn(cellClass, 'whitespace-nowrap text-(--theme-elevation-500)')}>
                    {hof.quartier ?? ''}
                  </td>
                  {grid.days.map((day) => {
                    const key = cellKey(hof.id, day);
                    const edit = edits.get(key);
                    const saved = grid.quotas[hof.id]?.[day];
                    const text = edit ?? (saved === undefined ? '' : String(saved));
                    const isInvalid = parseSlots(text) === undefined;
                    const isChanged =
                      edit !== undefined && (parseSlots(edit) ?? null) !== (saved ?? null);
                    return (
                      <td key={day} className={cellClass}>
                        <input
                          inputMode="numeric"
                          aria-label={`${hof.name}, ${dayLabel(locale, day)}`}
                          value={text}
                          onChange={(event) => {
                            const { value } = event.target;
                            setEdits((current) => new Map(current).set(key, value));
                          }}
                          className={cn(
                            'h-9 w-16 rounded border bg-(--theme-input-bg) px-2.5 text-(--theme-text) tabular-nums',
                            'border-(--theme-elevation-150)',
                            isChanged && 'border-(--theme-success-500)',
                            isInvalid && 'border-(--theme-error-400)',
                          )}
                          title={isChanged ? texts.unsaved[locale] : undefined}
                        />
                      </td>
                    );
                  })}
                  <td className={cn(cellClass, 'font-semibold tabular-nums')}>
                    {grid.days.reduce((sum, day) => sum + (valueOf(hof.id, day) ?? 0), 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={cn(cellClass, 'font-semibold')} colSpan={2}>
                  {texts.sumQuotas[locale]}
                </td>
                {grid.days.map((day) => (
                  <td key={day} className={cn(cellClass, 'font-semibold tabular-nums')}>
                    {sumOfDay(day)}
                  </td>
                ))}
                <td className={cellClass} />
              </tr>
              <tr>
                <td className={cn(cellClass, 'font-semibold')} colSpan={2}>
                  {texts.places[locale]}
                </td>
                {grid.days.map((day) => {
                  const places = grid.placesPerDay[day] ?? null;
                  const isShort = places !== null && places < sumOfDay(day);
                  return (
                    <td
                      key={day}
                      className={cn(
                        cellClass,
                        'font-semibold tabular-nums',
                        isShort && 'text-(--theme-error-500)',
                      )}
                      title={isShort ? texts.tooFewPlaces[locale] : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {places ?? texts.unlimited[locale]}
                        {isShort && (
                          <TriangleAlert
                            className="h-3.5 w-3.5"
                            aria-label={texts.tooFewPlaces[locale]}
                          />
                        )}
                      </span>
                    </td>
                  );
                })}
                <td className={cellClass} />
              </tr>
              <tr>
                <td className={cn(cellClass, 'text-(--theme-elevation-500)')} colSpan={2}>
                  {texts.enrolled[locale]}
                </td>
                {grid.days.map((day) => (
                  <td
                    key={day}
                    className={cn(cellClass, 'text-(--theme-elevation-500) tabular-nums')}
                  >
                    {grid.enrolledPerDay[day] ?? 0}
                  </td>
                ))}
                <td className={cellClass} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="m-0 flex items-center gap-1.5 text-(--theme-elevation-500)">
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
        {texts.tooFewPlaces[locale]}
      </p>
    </div>
  );
};
