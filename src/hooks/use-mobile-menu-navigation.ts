import { usePathname, useSearchParams } from 'next/navigation';
import type React from 'react';
import { startTransition, useCallback, useEffect, useSyncExternalStore } from 'react';

let globalMobileMenuOpen = false;
const listeners = new Set<() => void>();

function setMobileMenuOpenGlobal(value: boolean | ((previous: boolean) => boolean)): void {
  const nextValue = typeof value === 'function' ? value(globalMobileMenuOpen) : value;
  if (globalMobileMenuOpen !== nextValue) {
    globalMobileMenuOpen = nextValue;
    for (const listener of listeners) {
      listener();
    }
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return globalMobileMenuOpen;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMobileMenuNavigation(): {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean | ((previous: boolean) => boolean)) => void;
  checkClickEvent: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
} {
  const mobileMenuOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  // Close the menu automatically when the route fully changes.
  // This is the Next.js recommended approach, ensuring the menu stays open
  // horizontally during the Suspense load and only closes when the new page hits.
  useEffect(() => {
    // Push the state update to the end of the event loop to avoid React Compiler warnings
    // about synchronous setState during render/effect cycles.
    const timeoutId = setTimeout((): void => {
      setMobileMenuOpenGlobal(false);
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
          setMobileMenuOpenGlobal(false);
        });
      }
    },
    [],
  );

  return {
    mobileMenuOpen,
    setMobileMenuOpen: setMobileMenuOpenGlobal,
    checkClickEvent,
  };
}
