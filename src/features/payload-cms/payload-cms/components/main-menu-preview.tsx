'use client';

import { moreColumnLabel, splitMenuColumns } from '@/components/menu/menu-columns';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useFormFields, useTranslation } from '@payloadcms/ui';
import { ChevronDown, Menu, Pin } from 'lucide-react';
import { reduceFieldsToValues } from 'payload/shared';
import type React from 'react';

interface PreviewEntry {
  label?: string;
  pinnedToHeader?: boolean;
  subMenu?: PreviewEntry[];
}

const title: StaticTranslationString = {
  de: 'So sieht das Menü aus',
  en: 'How the menu looks',
  fr: 'Aperçu du menu',
};
const headerBar: StaticTranslationString = {
  de: 'Kopfzeile auf grossen Bildschirmen',
  en: 'Header bar on large screens',
  fr: 'Barre d’en-tête sur grands écrans',
};
const openMenu: StaticTranslationString = {
  de: 'Menü, aufgeklappt',
  en: 'Menu, opened',
  fr: 'Menu, ouvert',
};
const menuButton: StaticTranslationString = { de: 'Menü', en: 'Menu', fr: 'Menu' };
const noPinned: StaticTranslationString = {
  de: 'Nichts angeheftet. Hake bei einem Eintrag «In der Kopfzeile anheften» an.',
  en: 'Nothing pinned. Tick "Pin to the header bar" on an entry.',
  fr: 'Rien d’épinglé. Coche « Épingler dans la barre d’en-tête » sur une entrée.',
};
const untitled: StaticTranslationString = { de: 'Ohne Titel', en: 'Untitled', fr: 'Sans titre' };

const hasChildren = (entry: PreviewEntry): boolean =>
  Array.isArray(entry.subMenu) && entry.subMenu.length > 0;

const caption = 'mb-2 text-xs font-semibold tracking-wider text-(--theme-elevation-500) uppercase';

const PreviewLinks: React.FC<{ entries: PreviewEntry[]; fallback: string }> = ({
  entries,
  fallback,
}) => (
  <ul className="flex flex-col gap-1">
    {entries.map((entry, index) => (
      <li key={index}>
        <span className={cn(hasChildren(entry) && 'font-semibold')}>{entry.label ?? fallback}</span>
        {hasChildren(entry) && (
          <div className="mt-1 border-l border-(--theme-elevation-150) pl-2">
            <PreviewLinks entries={entry.subMenu ?? []} fallback={fallback} />
          </div>
        )}
      </li>
    ))}
  </ul>
);

/**
 * A live sketch of the main menu above its fields: what the header bar shows and how the opened
 * menu arranges the entries into columns. It follows the form as the editor types, so moving or
 * pinning an entry shows its effect before saving.
 */
export const MainMenuPreview: React.FC = () => {
  const fields = useFormFields(([formFields]) => formFields);
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);

  const values = reduceFieldsToValues(fields, true) as { mainMenu?: PreviewEntry[] };
  const entries = Array.isArray(values.mainMenu) ? values.mainMenu : [];
  const pinnedEntries = entries.filter((entry) => entry.pinnedToHeader === true);
  const { columns, more } = splitMenuColumns(entries);
  const fallback = untitled[locale];

  return (
    <div className="mb-8 rounded-sm border border-(--theme-elevation-150) p-4 text-sm">
      <p className="mb-4 font-semibold">{title[locale]}</p>

      <p className={caption}>{headerBar[locale]}</p>
      <div className="mb-6 flex items-center gap-4 rounded-sm bg-(--theme-elevation-50) px-4 py-3">
        <span className="font-bold">conveniat27</span>
        <span className="flex-1" />
        {pinnedEntries.length === 0 ? (
          <span className="text-(--theme-elevation-500)">{noPinned[locale]}</span>
        ) : (
          pinnedEntries.map((entry, index) => (
            <span key={index} className="flex items-center gap-1 font-semibold">
              <Pin className="size-3 text-(--theme-elevation-500)" />
              {entry.label ?? fallback}
              {hasChildren(entry) && <ChevronDown className="size-3" />}
            </span>
          ))
        )}
        <span className="flex items-center gap-1 rounded-sm border border-(--theme-elevation-250) px-2 py-1 font-semibold">
          <Menu className="size-3" />
          {menuButton[locale]}
        </span>
      </div>

      <p className={caption}>{openMenu[locale]}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4 rounded-sm bg-(--theme-elevation-50) p-4">
        {columns.map((entry, index) => (
          <div key={index}>
            <p className="mb-2 border-b border-(--theme-elevation-150) pb-1 text-xs font-bold uppercase">
              {entry.label ?? fallback}
            </p>
            <PreviewLinks entries={entry.subMenu ?? []} fallback={fallback} />
          </div>
        ))}
        {more.length > 0 && (
          <div>
            <p className="mb-2 border-b border-(--theme-elevation-150) pb-1 text-xs font-bold uppercase">
              {moreColumnLabel[locale]}
            </p>
            <PreviewLinks entries={more} fallback={fallback} />
          </div>
        )}
      </div>
    </div>
  );
};
