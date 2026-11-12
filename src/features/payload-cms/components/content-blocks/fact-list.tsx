import { Card } from '@/components/ui/card';
import { FactRow } from '@/components/ui/fact-row';
import { SectionLabel } from '@/components/ui/section-label';
import { contentIconOf } from '@/features/payload-cms/content-icons';
import type { FactListBlock } from '@/features/payload-cms/payload-types';
import { Info } from 'lucide-react';
import type React from 'react';

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
            icon={contentIconOf(fact.icon) ?? Info}
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
