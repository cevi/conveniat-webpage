'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { Pill, useRowLabel, useTranslation } from '@payloadcms/ui';
import { Pin } from 'lucide-react';
import type React from 'react';

const column: StaticTranslationString = {
  de: 'Spalte im Menü',
  en: 'Column of the menu',
  fr: 'Colonne du menu',
};
const inMoreColumn: StaticTranslationString = {
  de: 'Link in «Weiteres»',
  en: 'Link in "More"',
  fr: 'Lien dans « Plus »',
};
const group: StaticTranslationString = { de: 'Gruppe', en: 'Group', fr: 'Groupe' };
const link: StaticTranslationString = { de: 'Link', en: 'Link', fr: 'Lien' };
const linkOfGroup: StaticTranslationString = {
  de: 'Link der Gruppe',
  en: 'Link of the group',
  fr: 'Lien du groupe',
};
const subLink: StaticTranslationString = { de: 'Unterlink', en: 'Sub link', fr: 'Sous-lien' };
const pinned: StaticTranslationString = { de: 'Kopfzeile', en: 'Header bar', fr: 'En-tête' };

interface MenuRowData {
  label?: string;
  pinnedToHeader?: boolean;
  subMenu?: unknown;
}

/** Form state hands a nested array over as its rows, or as their count while it loads. */
const hasRows = (value: unknown): boolean =>
  (Array.isArray(value) && value.length > 0) || (typeof value === 'number' && value > 0);

/**
 * Where an entry of the main menu ends up on the website, read from its depth and whether it has
 * entries below it, so an editor sees the result without opening the site.
 */
const placementOf = (depth: number, hasChildren: boolean): StaticTranslationString => {
  if (depth === 1) return hasChildren ? column : inMoreColumn;
  if (depth === 2) return hasChildren ? group : link;
  if (depth === 3) return linkOfGroup;
  return subLink;
};

/** Names a row of the main menu after its label, with where it shows and whether it is pinned. */
export const MainEntryRowLabel: React.FC = () => {
  const { data, path } = useRowLabel<MenuRowData>();
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);

  // `mainMenu.0` is a column, `mainMenu.0.subMenu.1` an entry in it, and so on
  const depth = path.split('.subMenu.').length;
  const placement = placementOf(depth, hasRows(data.subMenu));

  return (
    <span className="flex items-center gap-2">
      <span>{data.label ?? ''}</span>
      <Pill pillStyle="light-gray" size="small">
        {placement[locale]}
      </Pill>
      {depth === 1 && data.pinnedToHeader === true && (
        <Pill pillStyle="success" size="small" icon={<Pin className="size-3" />}>
          {pinned[locale]}
        </Pill>
      )}
    </span>
  );
};
