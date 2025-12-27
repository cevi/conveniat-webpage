'use client';

import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import { TeamLeaderPortrait } from '@/features/payload-cms/components/accordion/team-members/team-leader-portrait';
import type { AccordionBlocks, Image } from '@/features/payload-cms/payload-types';
import { replaceUmlautsAndAccents } from '@/utils/node-to-anchor-reference';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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

  const title = (accordionBlock.title as string | undefined) ?? '';
  return accordionBlock.title === '' ? '' : sanitizeTitle(title);
};

/**
 * Creates the title element (either text or portrait) for the accordion item.
 */
const createTitleElement = (
  accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number],
): React.ReactNode => {
  if (accordionBlock.titleOrPortrait === 'title') {
    return <h3 className="text-lg font-medium text-gray-900">{accordionBlock.title}</h3>;
  }

  if (accordionBlock.teamLeaderGroup === undefined) return <></>;

  const teamLeaderGroup = accordionBlock.teamLeaderGroup as {
    name: string;
    ceviname?: string | null;
    portrait?: string | null | Image;
  };

  const name: string = teamLeaderGroup.name;
  const ceviname: string = teamLeaderGroup.ceviname ?? '';
  const portrait: string | Image | null | undefined = teamLeaderGroup.portrait;

  return (
    <button className="group flex w-full cursor-pointer flex-col items-center gap-4 rounded-md px-2 py-4 text-center transition-colors md:flex-row md:py-2 md:text-left">
      <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-full md:h-24 md:w-24">
        {<TeamLeaderPortrait name={name} portrait={portrait} hoverEffect={false} />}
      </div>
      <div className="w-full">
        <p className="font-medium text-gray-900">{name}</p>
        {ceviname !== '' && <p className="text-sm text-gray-500">{ceviname}</p>}
      </div>
    </button>
  );
};

const AccordionClientContainer: React.FC<{
  accordionBlocks: AccordionBlocks['accordionBlocks'];
  childs: {
    [key: string]: React.ReactNode;
  };
}> = ({ accordionBlocks, childs }) => {
  // Change expandedId to an array to hold multiple expanded fragments
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const accordionItemReferences = useRef<Record<string, HTMLDivElement | null>>({});

  // Helper functions that depend on component state/props remain inside
  const updateURLFragment = useCallback((fragment?: string) => {
    if (typeof globalThis !== 'undefined') {
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

      setExpandedIds((previousExpandedIds) => {
        // eslint-disable-next-line unicorn/prefer-ternary
        if (previousExpandedIds.includes(fragment)) {
          return previousExpandedIds.filter((id) => id !== fragment);
        } else {
          return [...previousExpandedIds, fragment];
        }
      });
      updateURLFragment(fragment);
    },
    [updateURLFragment],
  );

  useEffect((): void | (() => void) => {
    if (typeof globalThis !== 'undefined') {
      const hash = globalThis.location.hash.slice(1); // Remove the '#'
      if (hash !== '') {
        const isValidFragment = accordionBlocks?.some(
          (block) => getFragmentFromBlock(block) === hash,
        );
        if (isValidFragment === true) {
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
    }
  }, [accordionBlocks, scrollToElement]);

  return (
    <div className="space-y-4">
      {accordionBlocks?.map((accordionBlock) => {
        const fragment = getFragmentFromBlock(accordionBlock);
        return (
          <div
            key={fragment}
            ref={(element) => {
              accordionItemReferences.current[fragment] = element;
            }}
            className="scroll-mt-10"
          >
            {accordionBlock.id !== undefined && accordionBlock.id !== null && (
              <AccordionItem
                titleElement={createTitleElement(accordionBlock)}
                showChevron={accordionBlock.titleOrPortrait === 'title'}
                accordionId={accordionBlock.id}
                isExpanded={expandedIds.includes(fragment)}
                onToggle={() => toggleExpand(accordionBlock)}
              >
                {expandedIds.includes(fragment) && childs[accordionBlock.id ?? '']}
              </AccordionItem>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AccordionClientContainer;
