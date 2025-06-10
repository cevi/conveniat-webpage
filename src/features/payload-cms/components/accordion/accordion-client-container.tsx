'use client';

import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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
    return title.toLowerCase().replaceAll(/\W+/g, '-');
  }, []);

  const getFragmentFromBlock = useCallback(
    (accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number]): string => {
      return accordionBlock.title === '' ? '' : sanitizeTitle(accordionBlock.title);
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
        return title === undefined ? false : sanitizeTitle(title) === fragment;
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
            <AccordionItem
              accordionBlock={accordionBlock}
              isExpanded={expandedIds.includes(fragment)}
              onToggle={() => toggleExpand(accordionBlock)}
            >
              {expandedIds.includes(fragment) && childs[accordionBlock.id ?? '']}
            </AccordionItem>
          </div>
        );
      })}
    </div>
  );
};

export default AccordionClientContainer;
