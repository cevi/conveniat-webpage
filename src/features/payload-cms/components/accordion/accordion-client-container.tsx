'use client';

import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import { AccordionSearchBar } from '@/features/payload-cms/components/accordion/accordion-search-bar';
import { TeamLeaderPortrait } from '@/features/payload-cms/components/accordion/team-members/team-leader-portrait';
import type { AccordionBlocks, Image } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { replaceUmlautsAndAccents } from '@/utils/node-to-anchor-reference';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const searchPlaceholder: StaticTranslationString = {
  de: 'Suche…',
  en: 'Search…',
  fr: 'Rechercher…',
};

const noResultsLabel: StaticTranslationString = {
  de: 'Keine Einträge gefunden.',
  en: 'No entries found.',
  fr: 'Aucun résultat trouvé.',
};

/**
 * Sanitizes a title string into a URL-friendly fragment.
 */
const sanitizeTitle = (title: string): string => {
  return replaceUmlautsAndAccents(title).replaceAll(/\W+/g, '-');
};

/**
 * Gets the unique fragment identifier for an accordion block.
 */
const getFragmentFromBlock = (
  accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number],
): string => {
  const titleOrPortrait = accordionBlock.titleOrPortrait;
  if (titleOrPortrait === 'portrait') {
    if (accordionBlock.teamLeaderGroup === undefined) {
      return '';
    }

    const teamLeaderGroup = accordionBlock.teamLeaderGroup as {
      name: string;
    };

    return sanitizeTitle(teamLeaderGroup.name);
  }

  // Default to title behavior if 'portrait' is not explicitly selected
  const title = (accordionBlock.title as string | undefined) ?? '';
  return title === '' ? '' : sanitizeTitle(title);
};

/**
 * Creates the title element (either text or portrait) for the accordion item.
 */
const createTitleElement = (
  accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number],
): React.ReactNode => {
  if (accordionBlock.titleOrPortrait === 'portrait') {
    if (accordionBlock.teamLeaderGroup === undefined) return <></>;

    const teamLeaderGroup = accordionBlock.teamLeaderGroup;

    const name: string = teamLeaderGroup.name;
    const ceviname: string = teamLeaderGroup.ceviname ?? '';
    const portrait: string | Image | null | undefined = teamLeaderGroup.portrait;

    return (
      <button className="group flex w-full cursor-pointer flex-col items-center gap-4 rounded-md px-2 py-4 text-center transition-colors md:flex-row md:py-2 md:text-left">
        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-full md:h-24 md:w-24">
          {<TeamLeaderPortrait name={name} portrait={portrait} hoverEffect={false} />}
        </div>
        <div className="w-full">
          <p className="font-medium text-gray-900">{name}</p>
          {ceviname !== '' && <p className="text-sm text-gray-500">{ceviname}</p>}
        </div>
      </button>
    );
  }

  // Default to rendering title if 'portrait' is not selected or if title exists
  return <h3 className="text-lg font-medium text-gray-900">{accordionBlock.title}</h3>;
};

const AccordionClientContainer: React.FC<{
  accordionBlocks: AccordionBlocks['accordionBlocks'];
  childs: {
    [key: string]: React.ReactNode;
  };
  isNested?: boolean;
  enableSearch?: boolean;
  searchIndex?: Record<string, string>;
  locale?: Locale;
}> = ({ accordionBlocks, childs, isNested, enableSearch, searchIndex, locale }) => {
  // Change expandedId to an array to hold multiple expanded fragments
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const accordionItemReferences = useRef<Record<string, HTMLDivElement | null>>({});
  const lastHandledHashReference = useRef<string | undefined>(undefined);

  // Debounce the search query by 150 ms
  useEffect((): (() => void) => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim().toLowerCase());
    }, 150);
    return (): void => clearTimeout(timer);
  }, [rawQuery]);

  // Filter blocks based on the debounced query
  const visibleBlocks = useMemo(() => {
    if (!enableSearch || debouncedQuery === '' || searchIndex === undefined) {
      return accordionBlocks ?? [];
    }
    return (accordionBlocks ?? []).filter((block) => {
      const indexed =
        block.id !== undefined && block.id !== null ? (searchIndex[block.id] ?? '') : '';
      return indexed.includes(debouncedQuery);
    });
  }, [accordionBlocks, debouncedQuery, enableSearch, searchIndex]);

  // Helper functions that depend on component state/props remain inside
  const updateURLFragment = useCallback((fragment?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      if (fragment === undefined) {
        const newUrl = globalThis.location.pathname + globalThis.location.search;
        globalThis.history.replaceState(undefined, '', newUrl);
      } else {
        // When multiple are open, only the latest clicked one updates the URL
        globalThis.history.replaceState(undefined, '', `#${fragment}`);
      }
    }
  }, []);

  const scrollToElement = useCallback((fragment: string) => {
    const element = accordionItemReferences.current[fragment];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Function to handle toggling the expanded state
  const toggleExpand = useCallback(
    (accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number]): void => {
      const fragment = getFragmentFromBlock(accordionBlock);
      const isClosing = expandedIds.includes(fragment);

      setExpandedIds((previousExpandedIds) => {
        // eslint-disable-next-line unicorn/prefer-ternary
        if (previousExpandedIds.includes(fragment)) {
          return previousExpandedIds.filter((id) => id !== fragment);
        } else {
          return [...previousExpandedIds, fragment];
        }
      });

      updateURLFragment(isClosing ? undefined : fragment);
    },
    [expandedIds, updateURLFragment],
  );

  useEffect((): void | (() => void) => {
    // Only handle hash-based expansion for non-nested accordions to avoid auto-expansion bugs
    if (isNested === true) return;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      const hash = globalThis.location.hash.slice(1); // Remove the '#'
      if (hash === '') {
        lastHandledHashReference.current = undefined;
        return;
      }

      if (lastHandledHashReference.current === hash) {
        return;
      }

      const isValidFragment = accordionBlocks?.some(
        (block) => getFragmentFromBlock(block) === hash,
      );
      if (isValidFragment === true) {
        lastHandledHashReference.current = hash;

        const timer1 = setTimeout(() => {
          setExpandedIds([hash]);
        }, 0);

        const timer2 = setTimeout(() => {
          scrollToElement(hash);
        }, 150);

        return (): void => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }
    }
  }, [accordionBlocks, scrollToElement, isNested]);

  const totalCount = accordionBlocks?.length ?? 0;
  const effectiveLocale: Locale = locale ?? 'de';

  return (
    <div>
      {enableSearch === true && isNested !== true && (
        <AccordionSearchBar
          query={rawQuery}
          onChange={setRawQuery}
          placeholder={searchPlaceholder[effectiveLocale]}
          noResultsLabel={noResultsLabel[effectiveLocale]}
          resultCount={visibleBlocks.length}
          totalCount={totalCount}
        />
      )}
      <div className="space-y-4">
        {visibleBlocks.map((accordionBlock) => {
          const fragment = getFragmentFromBlock(accordionBlock);
          return (
            <div
              key={accordionBlock.id ?? fragment}
              ref={(element) => {
                accordionItemReferences.current[fragment] = element;
              }}
              className="scroll-mt-10"
            >
              {accordionBlock.id !== undefined && accordionBlock.id !== null && (
                <AccordionItem
                  titleElement={createTitleElement(accordionBlock)}
                  showChevron={accordionBlock.titleOrPortrait !== 'portrait'}
                  accordionId={accordionBlock.id}
                  isExpanded={expandedIds.includes(fragment)}
                  onToggle={() => toggleExpand(accordionBlock)}
                  isNested={isNested ?? false}
                >
                  {expandedIds.includes(fragment) && childs[accordionBlock.id ?? '']}
                </AccordionItem>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AccordionClientContainer;
