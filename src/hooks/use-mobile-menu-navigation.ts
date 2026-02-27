import { usePathname, useSearchParams } from 'next/navigation';
import type React from 'react';
import { startTransition, useCallback, useEffect, useState } from 'react';

export function useMobileMenuNavigation(): {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  checkClickEvent: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
} {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  // Close the menu automatically when the route fully changes.
  // This is the Next.js recommended approach, ensuring the menu stays open
  // horizontally during the Suspense load and only closes when the new page hits.
  useEffect(() => {
    // Push the state update to the end of the event loop to avoid React Compiler warnings
    // about synchronous setState during render/effect cycles.
    const timeoutId = setTimeout((): void => {
      setMobileMenuOpen(false);
    }, 0);
    return (): void => clearTimeout(timeoutId);
  }, [pathname, searchParameters]);

  const checkClickEvent = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      // check if the event target or any of its parents has the class 'closeNavOnClick'
      if ((event.target as HTMLElement).closest('.closeNavOnClick')) {
        // Wrap in startTransition for in-page anchors or same-page clicks
        // so React batches the state update with any concurrent rendering
        startTransition(() => {
          setMobileMenuOpen(false);
        });
      }
    },
    [setMobileMenuOpen],
  );

  return { mobileMenuOpen, setMobileMenuOpen, checkClickEvent };
}
