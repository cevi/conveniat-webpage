'use client';

import { LinkComponent } from '@/components/ui/link-component';
import type React from 'react';
import { createContext, useContext } from 'react';

/**
 * The pathname of the open page, provided by the desktop menu, which reads it anyway for its own
 * links. The menu drawer of a phone provides none, so its app links are never marked.
 */
export const CurrentMenuPathContext = createContext<string | undefined>(undefined);

/** `/fr/app/chat/123` is `/app/chat/123`: the app's links carry no locale. */
const LOCALE_PREFIX = /^\/(de|en|fr)(?=\/|$)/;

/** Whether `href` is the open page or a page below it, like a chat below the chat list. */
const isCurrentAppPage = (pathname: string, href: string): boolean => {
  const path = pathname.replace(LOCALE_PREFIX, '');
  return path === href || path.startsWith(`${href}/`);
};

/**
 * A link to one of the app's features, `aria-current` while its page is open. It is the
 * `group/feature`, so its content styles itself with `group-aria-[current=page]/feature:`.
 */
export const AppFeatureLink: React.FC<{
  href: string;
  openInNewTab: boolean;
  prefetch?: boolean;
  children: React.ReactNode;
}> = ({ href, openInNewTab, prefetch, children }) => {
  const pathname = useContext(CurrentMenuPathContext);
  const isCurrent = pathname !== undefined && isCurrentAppPage(pathname, href);

  return (
    <LinkComponent
      href={href}
      openInNewTab={openInNewTab}
      {...(prefetch === undefined ? {} : { prefetch })}
      aria-current={isCurrent ? 'page' : undefined}
      className="group/feature"
    >
      {children}
    </LinkComponent>
  );
};
