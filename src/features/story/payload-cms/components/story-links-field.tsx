'use client';

import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import { useStoryLinks } from '@/features/story/payload-cms/components/use-story-links';
import { formatStoryMoment } from '@/features/story/utils/story-time';
import type { StaticTranslationString } from '@/types/types';
import {
  FieldLabel,
  ShimmerEffect,
  useConfig,
  useDocumentInfo,
  useTranslation,
} from '@payloadcms/ui';
import { ScrollText, Trophy } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const label: StaticTranslationString = { de: 'Story', en: 'Story', fr: 'Histoire' };

const emptyText: Record<string, StaticTranslationString> = {
  'camp-schedule-entry': {
    de: 'Kein Ereignis und keine Challenge verknüpft.',
    en: 'No story event or challenge links this block.',
    fr: 'Aucun événement ni défi n’est lié à ce bloc.',
  },
  'story-figures': {
    de: 'Die Figur kommt noch in keinem Ereignis und keiner Challenge vor.',
    en: 'The figure appears in no event or challenge yet.',
    fr: 'Le personnage n’apparaît encore dans aucun événement ni défi.',
  },
};

const hint: Record<string, StaticTranslationString> = {
  'camp-schedule-entry': {
    de: 'Erscheint Leitenden in der App als «Was bisher geschah», sobald das Ereignis sichtbar ist. Verknüpft wird im Story-Board.',
    en: 'Shown to Leitende in the app once the event is visible. Linked on the Story-Board.',
    fr: 'Montré aux responsables dès que l’événement est visible. Lié dans le Story-Board.',
  },
  'story-figures': {
    de: 'Verknüpft wird beim Ereignis (Figuren) und bei der Challenge (Von).',
    en: 'Linked on the event (figures) and on the challenge (from).',
    fr: 'Lié depuis l’événement et le défi.',
  },
};

const openBoard: StaticTranslationString = {
  de: 'Story-Board öffnen',
  en: 'Open the Story-Board',
  fr: 'Ouvrir le Story-Board',
};

/**
 * Read only: the Ereignisse and Challenges that link to this document. The link is kept on the
 * story's side, so a block of the programme shows its story without owning it.
 */
export const StoryLinksField: React.FC = () => {
  const { id, collectionSlug } = useDocumentInfo();
  const { i18n } = useTranslation();
  const locale = getAdminLocale(i18n);
  const { config } = useConfig();
  const adminRoute = config.routes.admin;
  const { links, isLoading } = useStoryLinks(collectionSlug, id);
  const slug = collectionSlug ?? 'camp-schedule-entry';

  // a new document has nothing linking to it yet
  if (id === undefined) return <></>;

  return (
    <div className="field-type mb-6">
      <FieldLabel label={label[locale]} />
      {isLoading && <ShimmerEffect height={48} />}
      {!isLoading && links.length === 0 && (
        <p className="m-0 text-sm text-(--theme-elevation-500)">{emptyText[slug]?.[locale]}</p>
      )}
      {!isLoading && links.length > 0 && (
        <ul className="m-0 list-none overflow-hidden rounded-(--style-radius-s) border border-(--theme-elevation-150) p-0">
          {links.map((link) => {
            const Icon = link.collection === 'story-events' ? ScrollText : Trophy;
            return (
              <li key={link.id} className="border-b border-(--theme-elevation-100) last:border-b-0">
                <Link
                  href={`${adminRoute}/collections/${link.collection}/${link.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-(--theme-text) no-underline hover:bg-(--theme-elevation-50)"
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{link.title}</span>
                    {link.visibleFrom !== undefined && (
                      <span className="block text-xs text-(--theme-elevation-500)">
                        {formatStoryMoment(link.visibleFrom, locale)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 mb-0 text-xs text-(--theme-elevation-500)">
        {hint[slug]?.[locale]} <Link href={`${adminRoute}/story-board`}>{openBoard[locale]}</Link>
      </p>
    </div>
  );
};
