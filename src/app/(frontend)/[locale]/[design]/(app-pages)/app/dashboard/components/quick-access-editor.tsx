'use client';

import type { QuickAccessTileId } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import {
  moveTile,
  tileOf,
  toggleTile,
} from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { Switch } from '@/components/ui/switch';
import type { Locale, StaticTranslationString } from '@/types/types';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type React from 'react';
import type { RefObject } from 'react';

const texts = {
  title: {
    de: 'Schnellzugriff anpassen',
    en: 'Customize quick access',
    fr: "Personnaliser l'accès rapide",
  },
  description: {
    de: 'Gilt nur auf diesem Gerät.',
    en: 'Applies to this device only.',
    fr: "S'applique uniquement à cet appareil.",
  },
  shown: { de: 'Auf Home', en: 'On Home', fr: "Sur l'accueil" },
  more: { de: 'Weitere', en: 'More', fr: 'Autres' },
  noneShown: {
    de: 'Nichts ausgewählt, Home zeigt keinen Schnellzugriff.',
    en: 'Nothing chosen, Home shows no quick access.',
    fr: "Rien de choisi, l'accueil n'affiche pas d'accès rapide.",
  },
  moveUp: { de: 'nach oben', en: 'up', fr: 'vers le haut' },
  moveDown: { de: 'nach unten', en: 'down', fr: 'vers le bas' },
  reset: { de: 'Standard wiederherstellen', en: 'Restore default', fr: 'Rétablir par défaut' },
  done: { de: 'Fertig', en: 'Done', fr: 'Terminé' },
} satisfies Record<string, StaticTranslationString>;

const TileRow: React.FC<{
  id: QuickAccessTileId;
  locale: Locale;
  checked: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}> = ({ id, locale, checked, onToggle, children }) => {
  const tile = tileOf(id);
  const label = tile.label[locale];
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <IconTile icon={tile.icon} />
      {/* balanced, so "Mein QR-Code" breaks before the word and not at its hyphen */}
      <span className="min-w-0 flex-1 text-[15px] leading-5 font-medium text-balance text-green-900">
        {label}
      </span>
      {children}
      <Switch checked={checked} onCheckedChange={onToggle} aria-label={label} className="ml-1" />
    </li>
  );
};

/**
 * The sheet behind "Anpassen": every tile this user can have, the chosen ones on top in their
 * order with buttons to move them, the others below. A change shows on Home right away, so the
 * sheet needs no "Speichern".
 */
export const QuickAccessEditor: React.FC<{
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLElement | null>;
  /** the chosen tiles, hidden ones included, so a change keeps them */
  chosen: readonly QuickAccessTileId[];
  /** every tile available here, in the catalog's order */
  available: readonly QuickAccessTileId[];
  isCustomized: boolean;
  onChange: (next: QuickAccessTileId[]) => void;
  onReset: () => void;
}> = ({
  locale,
  open,
  onOpenChange,
  anchor,
  chosen,
  available,
  isCustomized,
  onChange,
  onReset,
}) => {
  const visible = new Set(available);
  const shown = chosen.filter((id) => visible.has(id));
  const more = available.filter((id) => !chosen.includes(id));

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={texts.title[locale]}
      description={texts.description[locale]}
      anchor={anchor}
      footer={
        <div className="flex gap-2">
          <Button
            variant="outlined"
            size="touch"
            className="flex-1"
            disabled={!isCustomized}
            onClick={onReset}
          >
            {texts.reset[locale]}
          </Button>
          <Button
            variant="primary"
            size="touch"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {texts.done[locale]}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="space-y-2">
          <SectionLabel as="h3">{texts.shown[locale]}</SectionLabel>
          {shown.length === 0 ? (
            <p className="text-[15px] text-green-700">{texts.noneShown[locale]}</p>
          ) : (
            <Card as="ul" divided>
              {shown.map((id, index) => {
                const label = tileOf(id).label[locale];
                return (
                  <TileRow
                    key={id}
                    id={id}
                    locale={locale}
                    checked
                    onToggle={() => onChange(toggleTile(chosen, id))}
                  >
                    <Button
                      variant="plain"
                      size="touchIcon"
                      aria-label={`${label} ${texts.moveUp[locale]}`}
                      disabled={index === 0}
                      onClick={() => onChange(moveTile(chosen, id, -1, visible))}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      variant="plain"
                      size="touchIcon"
                      aria-label={`${label} ${texts.moveDown[locale]}`}
                      disabled={index === shown.length - 1}
                      onClick={() => onChange(moveTile(chosen, id, 1, visible))}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                  </TileRow>
                );
              })}
            </Card>
          )}
        </section>

        {more.length > 0 && (
          <section className="space-y-2">
            <SectionLabel as="h3">{texts.more[locale]}</SectionLabel>
            <Card as="ul" divided>
              {more.map((id) => (
                <TileRow
                  key={id}
                  id={id}
                  locale={locale}
                  checked={false}
                  onToggle={() => onChange(toggleTile(chosen, id))}
                />
              ))}
            </Card>
          </section>
        )}
      </div>
    </BottomSheet>
  );
};
