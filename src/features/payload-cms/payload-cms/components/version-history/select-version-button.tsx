'use client';

import { useModal, useRouteTransition } from '@payloadcms/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';

/**
 * A version as a choice instead of a link.
 *
 * Payload's version view has a "more versions" drawer that lists all versions through the
 * document's versions view, and expects a click on one to pick it as the version to compare
 * with. This does what Payload's own cell for that drawer does: set `versionFrom` on the
 * current page and close the drawer.
 */
export const SelectVersionButton: React.FC<{ versionId: string; children: React.ReactNode }> = ({
  versionId,
  children,
}) => {
  const { closeAllModals } = useModal();
  const { startRouteTransition } = useRouteTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  return (
    <button
      // Payload's class for this very button, so it looks like the link it replaces
      className="created-at-cell"
      onClick={() => {
        closeAllModals();
        const parameters = new URLSearchParams(searchParameters.toString());
        parameters.set('versionFrom', versionId);
        startRouteTransition(() => router.push(`${pathname}?${parameters.toString()}`));
      }}
      type="button"
    >
      {children}
    </button>
  );
};
