'use client';

import { ScheduleComponent } from '@/features/schedule/components/schedule-component';
import {
  NoBlockSelected,
  ScheduleDetailView,
} from '@/features/schedule/components/schedule-detail-view';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useKeptScrollPosition } from '@/hooks/use-kept-scroll-position';
import { useParams, useSearchParams } from 'next/navigation';
import type React from 'react';
import { Activity } from 'react';

/** Beside the list on a desktop while no block is open: the one that matters most, see ScheduleComponent. */
const renderSuggestion = (suggestedId: string | undefined): React.ReactNode =>
  suggestedId === undefined ? (
    <NoBlockSelected />
  ) : (
    <ScheduleDetailView key={suggestedId} id={suggestedId} isSuggested />
  );

/**
 * Unified schedule page that handles both list and detail views.
 * - No id param: Shows schedule list
 * - With id param: Shows schedule details over the list, which stays mounted and hidden; a
 *   desktop keeps the list beside the details instead, the way the chats do, and shows the
 *   block that matters most there while none is open
 *
 * All data is fetched client-side via tRPC for offline support.
 */
const SchedulePage: React.FC = () => {
  const params = useParams();
  const searchParameters = useSearchParams();
  const idParameter = params['id'];

  // Extract ID from catch-all param (it's an array) or from query param
  const scheduleId =
    (Array.isArray(idParameter) ? idParameter[0] : idParameter) ?? searchParameters.get('id');

  const hasId = scheduleId !== null && scheduleId !== '';
  const isDesktop = useIsDesktop();
  const isListHidden = hasId && !isDesktop;
  useKeptScrollPosition(isListHidden);

  return (
    <>
      {/* hidden, not unmounted, under an open block on a phone: its search, its filters and its
          place survive the visit, the way Next.js keeps a page the user left */}
      <Activity mode={isListHidden ? 'hidden' : 'visible'}>
        {/* the width is where the block's pane starts, see ScheduleDetailView */}
        <div className="xl:border-line xl:min-h-[calc(100dvh-var(--app-content-top)-var(--app-tab-bar-height))] xl:w-[400px] xl:border-r">
          <ScheduleComponent
            openId={hasId ? scheduleId : undefined}
            // a phone shows the list alone while no block is open
            renderBesideList={isDesktop && !hasId ? renderSuggestion : undefined}
          />
        </div>
      </Activity>
      {hasId && <ScheduleDetailView id={scheduleId} />}
    </>
  );
};

export default SchedulePage;
