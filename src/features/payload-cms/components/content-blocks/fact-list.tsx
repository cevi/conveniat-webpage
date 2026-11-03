import { Card } from '@/components/ui/card';
import { FactRow } from '@/components/ui/fact-row';
import { SectionLabel } from '@/components/ui/section-label';
import type { FactListBlock } from '@/features/payload-cms/payload-types';
import type { LucideIcon } from 'lucide-react';
import {
  Backpack,
  CalendarDays,
  CarFront,
  Clock,
  Info,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Tent,
  Ticket,
  TrainFront,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import type React from 'react';

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  calendar: CalendarDays,
  clock: Clock,
  mapPin: MapPin,
  train: TrainFront,
  car: CarFront,
  ticket: Ticket,
  wallet: Wallet,
  utensils: Utensils,
  backpack: Backpack,
  tent: Tent,
  mail: Mail,
  phone: Phone,
  shield: ShieldCheck,
  info: Info,
};

/**
 * Facts in one card, each a row behind an icon tile, under an optional small title. A draft
 * skips validation, so a fact without a title is left out and an unknown icon falls back to the
 * info icon.
 */
export const FactList: React.FC<FactListBlock> = ({ title, facts }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- a draft may have none
  const shown = (facts ?? []).filter((fact) => typeof fact.title === 'string' && fact.title !== '');
  if (shown.length === 0) return <></>;
  return (
    <div>
      {typeof title === 'string' && title !== '' && (
        <SectionLabel className="mt-0 mb-2">{title}</SectionLabel>
      )}
      {/* the rows sit right in the card, which draws the line between them */}
      <Card>
        {shown.map((fact, index) => (
          <FactRow
            key={fact.id ?? index}
            icon={ICONS[fact.icon] ?? Info}
            title={fact.title}
            {...(typeof fact.description === 'string' && fact.description !== ''
              ? { sub: fact.description }
              : {})}
          />
        ))}
      </Card>
    </div>
  );
};
