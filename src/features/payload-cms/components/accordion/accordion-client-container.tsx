'use client';

import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import { TeamLeaderPortrait } from '@/features/payload-cms/components/accordion/team-members/team-leader-portrait';
import type { AccordionBlocks, Image } from '@/features/payload-cms/payload-types';
import { replaceUmlautsAndAccents } from '@/utils/node-to-anchor-reference';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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
      <div className="relative h-48 w-48 overflow-hidden rounded-full md:h-24 md:w-24">
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

  const sanitizeTitle = useCallback((title: string): string => {
    return replaceUmlautsAndAccents(title).replaceAll(/\W+/g, '-');
  }, []);

  const getFragmentFromBlock = useCallback(
    (accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number]): string => {
      const titleOrPortrait = accordionBlock.titleOrPortrait as 'title' | 'portrait';
      if (titleOrPortrait === 'portrait') {
        if (accordionBlock.teamLeaderGroup === undefined) {
          return '';
        }

        const teamLeaderGroup = accordionBlock.teamLeaderGroup as {
          name: string;
        };

        // Use the team leader's name as the fragment
        return sanitizeTitle(teamLeaderGroup.name);
      }

      const title = (accordionBlock.title as string | undefined) ?? '';
      return accordionBlock.title === '' ? '' : sanitizeTitle(title);
    },
    [sanitizeTitle],
  );

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

  const scrollToElement = useCallback(
    (fragment: string) => {
      const element = Object.values(accordionItemReferences.current).find((reference) => {
        const title = accordionBlocks?.find(
          (block) => accordionItemReferences.current[getFragmentFromBlock(block)] === reference,
        )?.title;
        return title === undefined ? false : sanitizeTitle(title ?? '') === fragment;
      });
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [accordionBlocks, sanitizeTitle, getFragmentFromBlock],
  );

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
    [updateURLFragment, getFragmentFromBlock],
  );

  // Effect to check the URL fragment on an initial load
  useEffect(() => {
    if (typeof globalThis !== 'undefined') {
      const hash = globalThis.location.hash.slice(1); // Remove the '#'
      if (hash !== '') {
        const isValidFragment = accordionBlocks?.some(
          (block) => getFragmentFromBlock(block) === hash,
        );
        if (isValidFragment === true) {
          // Initialize expandedIds with the fragment from the URL
          setExpandedIds([hash]);
          setTimeout(() => {
            scrollToElement(hash);
          }, 150);
        }
      }
    }
  }, [accordionBlocks, scrollToElement, getFragmentFromBlock]);

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
