import { BakuIcon } from '@/components/quartier/icons/baku';
import { CerberusIcon } from '@/components/quartier/icons/cerberus';
import { EinhornIcon } from '@/components/quartier/icons/einhorn';
import { GreifIcon } from '@/components/quartier/icons/greif';
import { KelpieIcon } from '@/components/quartier/icons/kelpie';
import { KitsuneIcon } from '@/components/quartier/icons/kitsune';
import { PhoenixIcon } from '@/components/quartier/icons/phoenix';
import { WolpertingerIcon } from '@/components/quartier/icons/wolpertinger';
import type { QuartierLabel } from '@/utils/quartier-names';
import type React from 'react';

/** The house of a Quartier: its animal and its colour, as on its banner. */
export interface QuartierHouse {
  rufname: string;
  /** the background of its dot, the banner's colour */
  dotClassName: string;
  Icon: React.FC<{ className?: string }>;
}

/**
 * The eight houses of the camp by Quartier number. Bundled with the app rather than kept in the
 * CMS, so the icons are there offline. The colours are the banners' own and stay as they are,
 * Kitsune's dark red included: it is the house's identity, not a Notfall red. Written as
 * arbitrary values, like the programme categories, because they belong to this map alone.
 */
export const QUARTIER_HOUSES: Readonly<Record<number, QuartierHouse>> = {
  1: { rufname: 'Einhorn', dotClassName: 'bg-[#89a02c]', Icon: EinhornIcon },
  2: { rufname: 'Kelpie', dotClassName: 'bg-[#4697d9]', Icon: KelpieIcon },
  3: { rufname: 'Wolpertinger', dotClassName: 'bg-[#225500]', Icon: WolpertingerIcon },
  4: { rufname: 'Kitsune', dotClassName: 'bg-[#800000]', Icon: KitsuneIcon },
  5: { rufname: 'Greif', dotClassName: 'bg-[#d26b26]', Icon: GreifIcon },
  6: { rufname: 'Cerberus', dotClassName: 'bg-[#8d008d]', Icon: CerberusIcon },
  7: { rufname: 'Phoenix', dotClassName: 'bg-[#d4aa00]', Icon: PhoenixIcon },
  8: { rufname: 'Baku', dotClassName: 'bg-[#362468]', Icon: BakuIcon },
};

/** The house of a Quartier by its number; none for a Quartier without a known number. */
export const quartierHouseOf = (quartier: QuartierLabel): QuartierHouse | undefined =>
  typeof quartier.number === 'number' ? QUARTIER_HOUSES[quartier.number] : undefined;
