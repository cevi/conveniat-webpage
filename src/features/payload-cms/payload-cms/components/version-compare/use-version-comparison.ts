import type { DiffSummary } from '@/features/payload-cms/payload-cms/components/version-compare/frame-diff';
import {
  applyDiff,
  clearDiff,
  readScrollAnchors,
} from '@/features/payload-cms/payload-cms/components/version-compare/frame-diff';
import { mapScrollPosition } from '@/features/payload-cms/payload-cms/components/version-compare/scroll-map';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

/** How long a pane keeps the lead after its last scroll event, in milliseconds. */
const SCROLL_LEAD_MS = 150;
/** How long the pages have to stay unchanged before they are compared again. */
const SETTLE_MS = 250;

/**
 * The document of a frame once its page is there. The frames show pages of this origin, so
 * the admin panel may read them; a frame that is still loading holds `about:blank`.
 */
const readyDocument = (frame: HTMLIFrameElement | null): Document | undefined => {
  const page = frame?.contentDocument;
  if (page?.readyState !== 'complete' || page.location.href === 'about:blank') {
    return undefined;
  }
  return page;
};

/**
 * Keeps two framed versions of a page scrolling together and marks what differs between them.
 *
 * @returns the number of blocks that differ, and the handler both frames call once loaded
 */
export const useVersionComparison = ({
  beforeFrame,
  afterFrame,
  highlight,
}: {
  beforeFrame: React.RefObject<HTMLIFrameElement | null>;
  afterFrame: React.RefObject<HTMLIFrameElement | null>;
  highlight: boolean;
}): { summary: DiffSummary | undefined; onFrameLoad: () => void } => {
  const [summary, setSummary] = useState<DiffSummary>();
  // counts frame loads, so the effects run again when either page arrives or navigates
  const [loads, setLoads] = useState(0);
  const onFrameLoad = useCallback(() => setLoads((count) => count + 1), []);

  useEffect(() => {
    const before = readyDocument(beforeFrame.current);
    const after = readyDocument(afterFrame.current);
    if (before === undefined || after === undefined) return;

    if (!highlight) {
      clearDiff(before);
      clearDiff(after);
      return;
    }

    let settle: ReturnType<typeof setTimeout> | undefined;
    const compare = (): void => setSummary(applyDiff(before, after));
    compare();

    // `load` is not the end: the blocks stream in after it, and hydration and client components
    // go on replacing the text nodes the marks point at. Marking a page changes attributes and
    // the registry of highlights, neither of which is observed here, so this cannot feed itself.
    const observers = [before, after].map((page) => {
      // built by the frame's own window, the one that owns the nodes it watches
      const observer = new (page.defaultView ?? globalThis).MutationObserver(() => {
        clearTimeout(settle);
        settle = setTimeout(compare, SETTLE_MS);
      });
      observer.observe(page.body, { characterData: true, childList: true, subtree: true });
      return observer;
    });

    return (): void => {
      clearTimeout(settle);
      for (const observer of observers) observer.disconnect();
    };
  }, [beforeFrame, afterFrame, highlight, loads]);

  useEffect(() => {
    const before = readyDocument(beforeFrame.current);
    const after = readyDocument(afterFrame.current);
    const beforeWindow = before?.defaultView;
    const afterWindow = after?.defaultView;
    if (!before || !after || !beforeWindow || !afterWindow) return;

    // Moving one pane makes the other one fire scroll events too. Whichever pane scrolled first
    // leads until it has been quiet for a moment; events from the other one are echoes.
    let leader: Window | undefined;
    let release: ReturnType<typeof setTimeout> | undefined;

    const follow = (source: Window, target: Window, flip: boolean) => (): void => {
      if (leader !== undefined && leader !== source) return;
      leader = source;
      clearTimeout(release);
      release = setTimeout(() => {
        leader = undefined;
      }, SCROLL_LEAD_MS);

      const anchors = readScrollAnchors(before, after).map(({ from, to }) =>
        flip ? { from: to, to: from } : { from, to },
      );
      target.scrollTo({ top: mapScrollPosition(anchors, source.scrollY), behavior: 'instant' });
    };

    const beforeLeads = follow(beforeWindow, afterWindow, false);
    const afterLeads = follow(afterWindow, beforeWindow, true);
    beforeWindow.addEventListener('scroll', beforeLeads, { passive: true });
    afterWindow.addEventListener('scroll', afterLeads, { passive: true });

    return (): void => {
      clearTimeout(release);
      beforeWindow.removeEventListener('scroll', beforeLeads);
      afterWindow.removeEventListener('scroll', afterLeads);
    };
  }, [beforeFrame, afterFrame, loads]);

  return { summary: highlight ? summary : undefined, onFrameLoad };
};
