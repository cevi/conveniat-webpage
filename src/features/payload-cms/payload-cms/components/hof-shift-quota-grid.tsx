'use client';

import type {
  QuotaGrid,
  QuotaImport,
} from '@/features/payload-cms/payload-cms/endpoints/hof-shift-quota-endpoints';
import type { QuotaDistributionSettings } from '@/features/payload-cms/payload-cms/utils/hof-shift-quota-formula';
import { distributeQuotas } from '@/features/payload-cms/payload-cms/utils/hof-shift-quota-formula';
import type {
  CampDay,
  QuotaChange,
} from '@/features/payload-cms/payload-cms/utils/hof-shift-quotas';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Banner, Button, toast } from '@payloadcms/ui';
import {
  ChevronDown,
  ChevronRight,
  Download,
  RotateCcw,
  Save,
  Shuffle,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';

const texts = {
  search: { de: 'Hof suchen', en: 'Search Hof', fr: 'Chercher un Hof' },
  allQuartiere: { de: 'Alle Quartiere', en: 'All Quartiere', fr: 'Tous les quartiers' },
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  quartier: { de: 'Quartier', en: 'Quartier', fr: 'Quartier' },
  leaders: { de: 'Leitende', en: 'Leaders', fr: 'Responsables' },
  total: { de: 'Total', en: 'Total', fr: 'Total' },
  share: { de: 'Anteil', en: 'Share', fr: 'Part' },
  shareHint: {
    de: 'Total der Einsätze im Verhältnis zu den Leitenden des Hofs',
    en: 'Total shifts relative to the leaders of the Hof',
    fr: 'Total des services par rapport aux responsables du Hof',
  },
  sumQuotas: { de: 'Summe Kontingente', en: 'Sum of quotas', fr: 'Somme des quotas' },
  places: {
    de: 'Plätze in Schichteinsätzen',
    en: 'Places in shifts',
    fr: 'Places dans les services',
  },
  openPlaces: { de: 'Offene Plätze', en: 'Open places', fr: 'Places non couvertes' },
  openPlacesHint: {
    de: 'Plätze, die kein Kontingent abdeckt. Neu verteilen oder Kontingente erhöhen.',
    en: 'Places no quota covers. Distribute again or raise quotas.',
    fr: 'Places qu’aucun quota ne couvre. Répartir à nouveau ou augmenter les quotas.',
  },
  enrolled: { de: 'Davon angemeldet', en: 'Of which enrolled', fr: 'Dont inscrits' },
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
  noDays: {
    de: 'Es gibt noch keine Schichteinsätze. Die Spalten sind die Tage, an denen es welche gibt.',
    en: 'There are no shifts yet. The columns are the days that have some.',
    fr: 'Il n’y a pas encore de services. Les colonnes sont les jours qui en ont.',
  },
  withoutPlaces: {
    de: 'Diese Schichteinsätze nennen keine Anzahl Helfende und fehlen in den Plätzen:',
    en: 'These shifts name no number of helpers and are missing from the places:',
    fr: 'Ces services n’indiquent pas de nombre de helpers et manquent dans les places :',
  },
  distribution: { de: 'Verteilung', en: 'Distribution', fr: 'Répartition' },
  coverage: { de: 'Abdeckung', en: 'Coverage', fr: 'Couverture' },
  coverageUnit: { de: '% der Plätze', en: '% of the places', fr: '% des places' },
  coverageHint: {
    de: 'Über 100 % plant Reserve für Ausfälle ein.',
    en: 'Above 100 % plans a reserve for no-shows.',
    fr: 'Au-delà de 100 %, prévoit une réserve pour les absences.',
  },
  weighting: { de: 'Grosse Höfe', en: 'Big Höfe', fr: 'Grands Höfe' },
  evenedOut: { de: 'ausgeglichen', en: 'evened out', fr: 'équilibré' },
  proportional: {
    de: 'streng proportional',
    en: 'strictly proportional',
    fr: 'strictement proportionnel',
  },
  weightingHint: {
    de: 'Proportional gibt jeder Hof denselben Anteil seiner Leitenden. Ausgeglichen verlangt von grossen Höfen etwas weniger.',
    en: 'Proportional asks the same share of every Hof’s leaders. Evened out asks a little less of big Höfe.',
    fr: 'Proportionnel demande la même part des responsables de chaque Hof. Équilibré demande un peu moins aux grands Höfe.',
  },
  maxPerDay: { de: 'Höchstens pro Tag', en: 'At most per day', fr: 'Au plus par jour' },
  maxPerDayUnit: {
    de: '% der Leitenden eines Hofs',
    en: '% of a Hof’s leaders',
    fr: '% des responsables d’un Hof',
  },
  maxPerDayHint: {
    de: 'Was ein Hof darüber leisten müsste, übernehmen die anderen.',
    en: 'What a Hof would owe beyond that goes to the others.',
    fr: 'Ce qu’un Hof devrait au-delà revient aux autres.',
  },
  distribute: { de: 'Neu verteilen', en: 'Distribute again', fr: 'Répartir à nouveau' },
  preview: {
    de: 'Vorschau: {cells} Felder ändern sich bei {hoefe} Höfen, von Hand gesetzte Felder bleiben. Erst «Speichern» übernimmt sie, danach sehen die AVPs sie in der App.',
    en: 'Preview: {cells} cells change for {hoefe} Höfe, cells set by hand stay. Only “Save” keeps them, then the AVPs see them in the app.',
    fr: 'Aperçu : {cells} cellules changent pour {hoefe} Höfe, les cellules saisies à la main restent. Seul « Enregistrer » les garde, ensuite les AVP les voient dans l’app.',
  },
  previewNone: {
    de: 'Die Verteilung ergibt dieselben Kontingente wie jetzt.',
    en: 'The distribution gives the same quotas as now.',
    fr: 'La répartition donne les mêmes quotas qu’actuellement.',
  },
  discard: { de: 'Verwerfen', en: 'Discard', fr: 'Annuler' },
  was: { de: 'war', en: 'was', fr: 'avant' },
  unpin: {
    de: 'Zurück zur Formel',
    en: 'Back to the formula',
    fr: 'Revenir à la formule',
  },
  legendComputed: { de: 'berechnet', en: 'computed', fr: 'calculé' },
  legendPinned: {
    de: 'von Hand gesetzt, ↺ zurück zur Formel',
    en: 'set by hand, ↺ back to the formula',
    fr: 'saisi à la main, ↺ revenir à la formule',
  },
  legendProposed: {
    de: 'ändert sich mit «Neu verteilen»',
    en: 'changes with “Distribute again”',
    fr: 'change avec « Répartir à nouveau »',
  },
  noLeaders: {
    de: 'Für keinen Hof sind Leitende bekannt. Die Zahlen kommen aus dem Abgleich der Rechnungen mit der Cevi.DB; ohne sie kann nichts verteilt werden.',
    en: 'No Hof has known leaders. The counts come from the billing sync with Cevi.DB; without them nothing can be distributed.',
    fr: 'Aucun Hof n’a de responsables connus. Les nombres viennent de la synchronisation de la facturation avec la Cevi.DB ; sans eux rien ne peut être réparti.',
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

/** A cell's number, `null` for empty, `undefined` for something that is no quota. */
const parseSlots = (text: string): number | null | undefined => {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 && value <= 999 ? value : undefined;
};

/** A cell as the page holds it until "Speichern". */
interface CellEdit {
  text: string;
  pinned: boolean;
  /** put there by "Neu verteilen", shown with what it was */
  proposed: boolean;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min));

/**
 * The grid of the Schicht-Kontingente: one row per Hof, one column per day with a Schichteinsatz.
 * "Neu verteilen" spreads each day's places over the Höfe by their Leitende and shows the result
 * as a preview; a cell typed in by hand is pinned and stays when it runs again. Nothing counts
 * until "Speichern", an imported workbook included.
 */
export const HofShiftQuotaGrid: React.FC<{ initialGrid: QuotaGrid; locale: Locale }> = ({
  initialGrid,
  locale,
}) => {
  const [grid, setGrid] = useState(initialGrid);
  const [edits, setEdits] = useState<Map<string, CellEdit>>(new Map());
  const [settings, setSettings] = useState<QuotaDistributionSettings>(initialGrid.settings);
  const [distributed, setDistributed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(Object.keys(initialGrid.quotas).length === 0);
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

  const savedOf = (hofId: string, day: CampDay): number | null => grid.quotas[hofId]?.[day] ?? null;
  const savedPinned = (hofId: string, day: CampDay): boolean =>
    grid.pinned[hofId]?.[day] !== undefined;
  const valueOf = (hofId: string, day: CampDay): number | null => {
    const edit = edits.get(cellKey(hofId, day));
    return edit === undefined ? savedOf(hofId, day) : (parseSlots(edit.text) ?? null);
  };
  const isPinned = (hofId: string, day: CampDay): boolean =>
    edits.get(cellKey(hofId, day))?.pinned ?? savedPinned(hofId, day);

  const visibleHoefe = grid.hoefe.filter(
    (hof) =>
      (quartier === '' || hof.quartier === quartier) &&
      hof.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const sumOfDay = (day: CampDay): number =>
    grid.hoefe.reduce((sum, hof) => sum + (valueOf(hof.id, day) ?? 0), 0);

  const changes: QuotaChange[] = [...edits].flatMap(([key, edit]) => {
    const [hofId = '', day = ''] = key.split(' ');
    const slots = parseSlots(edit.text);
    if (slots === undefined) return [];
    const unchanged = slots === savedOf(hofId, day) && edit.pinned === savedPinned(hofId, day);
    return unchanged ? [] : [{ hofId, day, slots, pinned: edit.pinned }];
  });
  const hasInvalidEdit = [...edits.values()].some((edit) => parseSlots(edit.text) === undefined);
  const proposedCells = [...edits].filter(([, edit]) => edit.proposed);
  const proposedHoefe = new Set(proposedCells.map(([key]) => key.split(' ')[0]));
  const hasLeaders = grid.hoefe.some((hof) => hof.leaders > 0);

  const distribute = (): void => {
    const pinned: Record<string, Record<CampDay, number>> = {};
    for (const hof of grid.hoefe) {
      for (const day of grid.days) {
        if (!isPinned(hof.id, day)) continue;
        (pinned[hof.id] ??= {})[day] = valueOf(hof.id, day) ?? 0;
      }
    }
    const result = distributeQuotas({
      days: grid.days,
      hoefe: grid.hoefe,
      placesPerDay: grid.placesPerDay,
      pinned,
      settings,
    });
    setEdits((current) => {
      const next = new Map(current);
      for (const hof of grid.hoefe) {
        for (const day of grid.days) {
          const key = cellKey(hof.id, day);
          if (isPinned(hof.id, day)) continue;
          const value = result[hof.id]?.[day] ?? 0;
          if (value === savedOf(hof.id, day) && !savedPinned(hof.id, day)) next.delete(key);
          else next.set(key, { text: String(value), pinned: false, proposed: true });
        }
      }
      return next;
    });
    setDistributed(true);
  };

  const discardProposal = (): void => {
    setEdits((current) => new Map([...current].filter(([, edit]) => !edit.proposed)));
    setDistributed(false);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const response = await fetch('/api/helper-shifts/quotas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, ...(distributed ? { settings } : {}) }),
      });
      if (!response.ok) throw new Error(`saving failed with ${String(response.status)}`);
      const saved = (await response.json()) as QuotaGrid;
      setGrid(saved);
      setSettings(saved.settings);
      setEdits(new Map());
      setDistributed(false);
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
          next.set(cellKey(change.hofId, change.day), {
            text: change.slots === null ? '' : String(change.slots),
            pinned: change.pinned,
            proposed: false,
          });
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
  // the Hof stays in view while the days scroll sideways
  const stickyClass = 'sticky left-0 z-[1] bg-(--theme-elevation-0)';
  const numberInputClass =
    'h-9 w-20 rounded border border-(--theme-elevation-150) bg-(--theme-input-bg) px-2.5 tabular-nums';

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

      {grid.shiftsWithoutPlaces.length > 0 && (
        <Banner type="error">
          <p className="m-0">{texts.withoutPlaces[locale]}</p>
          <ul className="m-0 mt-1 pl-5">
            {grid.shiftsWithoutPlaces.map((shift) => (
              <li key={shift.id}>
                <a href={`/admin/collections/helper-shifts/${shift.id}`}>
                  {shift.title}, {dayLabel(locale, shift.day)} {shift.time}
                </a>
              </li>
            ))}
          </ul>
        </Banner>
      )}

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

      {grid.days.length > 0 && (
        <section className="rounded border border-(--theme-elevation-150) bg-(--theme-elevation-50) px-4 py-3">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold text-(--theme-text)"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            {panelOpen ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
            {texts.distribution[locale]}
          </button>
          {panelOpen && (
            <div className="mt-3 flex flex-col gap-3">
              {!hasLeaders && <Banner type="info">{texts.noLeaders[locale]}</Banner>}
              <div className="grid items-start gap-6 md:grid-cols-[repeat(3,minmax(0,280px))_1fr]">
                <label className="flex flex-col gap-1">
                  <span className="font-semibold">{texts.coverage[locale]}</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={settings.coveragePercent}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          coveragePercent: clamp(Number(event.target.value), 10, 300),
                        }))
                      }
                      className={numberInputClass}
                    />
                    {texts.coverageUnit[locale]}
                  </span>
                  <span className="text-(--theme-elevation-500)">{texts.coverageHint[locale]}</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold">{texts.weighting[locale]}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={settings.weightingPercent}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        weightingPercent: clamp(Number(event.target.value), 0, 100),
                      }))
                    }
                    className="h-9 accent-(--theme-elevation-800)"
                  />
                  <span className="flex justify-between text-xs text-(--theme-elevation-500)">
                    <span>{texts.evenedOut[locale]}</span>
                    <span>{texts.proportional[locale]}</span>
                  </span>
                  <span className="text-(--theme-elevation-500)">
                    {texts.weightingHint[locale]}
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold">{texts.maxPerDay[locale]}</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.maxPerDayPercent}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          maxPerDayPercent: clamp(Number(event.target.value), 1, 100),
                        }))
                      }
                      className={numberInputClass}
                    />
                    {texts.maxPerDayUnit[locale]}
                  </span>
                  <span className="text-(--theme-elevation-500)">
                    {texts.maxPerDayHint[locale]}
                  </span>
                </label>
                <div className="flex justify-end">
                  <Button
                    buttonStyle="secondary"
                    size="medium"
                    margin={false}
                    disabled={!hasLeaders}
                    icon={<Shuffle className="h-4 w-4" />}
                    iconPosition="left"
                    onClick={distribute}
                  >
                    {texts.distribute[locale]}
                  </Button>
                </div>
              </div>
              {distributed && (
                <Banner type={proposedCells.length > 0 ? 'info' : 'success'}>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="flex-1">
                      {proposedCells.length > 0
                        ? texts.preview[locale]
                            .replace('{cells}', String(proposedCells.length))
                            .replace('{hoefe}', String(proposedHoefe.size))
                        : texts.previewNone[locale]}
                    </span>
                    {proposedCells.length > 0 && (
                      <Button
                        buttonStyle="secondary"
                        size="small"
                        margin={false}
                        onClick={discardProposal}
                      >
                        {texts.discard[locale]}
                      </Button>
                    )}
                  </span>
                </Banner>
              )}
            </div>
          )}
        </section>
      )}

      {grid.days.length === 0 ? (
        <Banner type="info">{texts.noDays[locale]}</Banner>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-(--theme-elevation-0)">
            <thead>
              <tr>
                <th className={cn(headClass, stickyClass)}>{texts.hof[locale]}</th>
                <th className={headClass}>{texts.quartier[locale]}</th>
                <th className={cn(headClass, 'text-right')}>{texts.leaders[locale]}</th>
                {grid.days.map((day) => (
                  <th key={day} className={headClass}>
                    {dayLabel(locale, day)}
                  </th>
                ))}
                <th className={cn(headClass, 'text-right')}>{texts.total[locale]}</th>
                <th className={cn(headClass, 'text-right')} title={texts.shareHint[locale]}>
                  {texts.share[locale]}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleHoefe.map((hof) => {
                const total = grid.days.reduce((sum, day) => sum + (valueOf(hof.id, day) ?? 0), 0);
                return (
                  <tr key={hof.id}>
                    <td className={cn(cellClass, stickyClass, 'font-semibold whitespace-nowrap')}>
                      {hof.name}
                    </td>
                    <td className={cn(cellClass, 'whitespace-nowrap text-(--theme-elevation-500)')}>
                      {hof.quartier ?? ''}
                    </td>
                    <td
                      className={cn(
                        cellClass,
                        'text-right text-(--theme-elevation-500) tabular-nums',
                      )}
                    >
                      {hof.leaders}
                    </td>
                    {grid.days.map((day) => {
                      const key = cellKey(hof.id, day);
                      const edit = edits.get(key);
                      const saved = savedOf(hof.id, day);
                      const text = edit?.text ?? (saved === null ? '' : String(saved));
                      const pinned = isPinned(hof.id, day);
                      const isInvalid = parseSlots(text) === undefined;
                      const proposed = edit?.proposed === true;
                      return (
                        <td key={day} className={cellClass}>
                          <span className="relative inline-flex">
                            <input
                              inputMode="numeric"
                              aria-label={`${hof.name}, ${dayLabel(locale, day)}`}
                              value={text}
                              onChange={(event) => {
                                const { value } = event.target;
                                // typed in by hand: "Neu verteilen" keeps it from now on
                                setEdits((current) =>
                                  new Map(current).set(key, {
                                    text: value,
                                    pinned: true,
                                    proposed: false,
                                  }),
                                );
                              }}
                              className={cn(
                                'h-9 w-16 rounded border bg-(--theme-input-bg) px-2.5 tabular-nums',
                                'border-(--theme-elevation-150) text-(--theme-elevation-500)',
                                pinned &&
                                  'border-(--theme-elevation-800) pr-6 font-bold text-(--theme-text)',
                                proposed && 'bg-(--theme-warning-100)',
                                isInvalid && 'border-(--theme-error-400)',
                              )}
                            />
                            {pinned && (
                              <button
                                type="button"
                                title={texts.unpin[locale]}
                                aria-label={`${texts.unpin[locale]}: ${hof.name}, ${dayLabel(locale, day)}`}
                                className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0.5 text-(--theme-elevation-500)"
                                onClick={() =>
                                  setEdits((current) =>
                                    new Map(current).set(key, {
                                      text,
                                      pinned: false,
                                      proposed: false,
                                    }),
                                  )
                                }
                              >
                                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                              </button>
                            )}
                            {proposed && (
                              <span className="absolute -top-2 -right-2 rounded-full bg-(--theme-warning-500) px-1.5 text-[10px] leading-4 font-semibold text-(--theme-elevation-0)">
                                {texts.was[locale]} {saved ?? '–'}
                              </span>
                            )}
                          </span>
                        </td>
                      );
                    })}
                    <td className={cn(cellClass, 'text-right font-semibold tabular-nums')}>
                      {total}
                    </td>
                    <td
                      className={cn(
                        cellClass,
                        'text-right text-(--theme-elevation-500) tabular-nums',
                      )}
                    >
                      {hof.leaders > 0
                        ? `${String(Math.round((100 * total) / hof.leaders))} %`
                        : '–'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className={cn(cellClass, stickyClass, 'font-semibold')} colSpan={3}>
                  {texts.places[locale]}
                </td>
                {grid.days.map((day) => (
                  <td key={day} className={cn(cellClass, 'font-semibold tabular-nums')}>
                    {grid.placesPerDay[day] ?? 0}
                  </td>
                ))}
                <td className={cellClass} colSpan={2} />
              </tr>
              <tr>
                <td className={cn(cellClass, stickyClass, 'font-semibold')} colSpan={3}>
                  {texts.sumQuotas[locale]}
                </td>
                {grid.days.map((day) => (
                  <td key={day} className={cn(cellClass, 'font-semibold tabular-nums')}>
                    {sumOfDay(day)}
                  </td>
                ))}
                <td className={cellClass} colSpan={2} />
              </tr>
              <tr>
                <td
                  className={cn(cellClass, stickyClass, 'text-(--theme-elevation-500)')}
                  colSpan={3}
                  title={texts.openPlacesHint[locale]}
                >
                  {texts.openPlaces[locale]}
                </td>
                {grid.days.map((day) => {
                  const open = (grid.placesPerDay[day] ?? 0) - sumOfDay(day);
                  return (
                    <td
                      key={day}
                      className={cn(
                        cellClass,
                        'font-semibold tabular-nums',
                        open > 0 ? 'text-(--theme-error-500)' : 'text-(--theme-success-500)',
                      )}
                      title={open > 0 ? texts.openPlacesHint[locale] : undefined}
                    >
                      {open > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          {open}
                          <TriangleAlert
                            className="h-3.5 w-3.5"
                            aria-label={texts.openPlacesHint[locale]}
                          />
                        </span>
                      ) : (
                        '✓'
                      )}
                    </td>
                  );
                })}
                <td className={cellClass} colSpan={2} />
              </tr>
              <tr>
                <td
                  className={cn(cellClass, stickyClass, 'text-(--theme-elevation-500)')}
                  colSpan={3}
                >
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
                <td className={cellClass} colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="m-0 flex flex-wrap items-center gap-5 text-(--theme-elevation-500)">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-4 w-6 rounded-sm border border-(--theme-elevation-150)" />
          {texts.legendComputed[locale]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-4 w-6 rounded-sm border border-(--theme-elevation-800)" />
          {texts.legendPinned[locale]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-4 w-6 rounded-sm border border-(--theme-elevation-150) bg-(--theme-warning-100)" />
          {texts.legendProposed[locale]}
        </span>
      </p>
    </div>
  );
};
