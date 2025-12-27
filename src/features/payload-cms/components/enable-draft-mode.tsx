'use client';
import React from 'react';

/**
 *
 * Once a user has accessed the admin dashboard, this component will enable draft mode,
 * such that we render the preview bar at the top of the screen and bypass any static
 * pre-rendering for pages, i.e. this forces all pages to be rendered dynamically.
 *
 * A user can now change to the preview mode using the preview bar at the top of the screen.
 * This will stay active until the user clears the `__prerender_bypass` cookie.
 *
 */
export const EnableDraftMode: React.FC = () => {
  React.useEffect(() => {
    fetch('/api/draft?auth=session')
      .then((response) => {
        if (response.ok) {
          console.log('Draft mode enabled');
        } else {
          console.log('Failed to enable draft mode');
        }
      })
      .catch((error: unknown) => {
        console.log('Error enabling draft mode:', error);
      });
  });

  return <></>;
};
