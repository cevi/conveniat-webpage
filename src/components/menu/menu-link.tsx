'use client';

import { LinkComponent } from '@/components/ui/link-component';
import { environmentVariables } from '@/config/environment-variables';
import { cn } from '@/utils/tailwindcss-override';
import { usePathname } from 'next/navigation';
import type React from 'react';

const localePrefix = /^\/(de|en|fr)(?=\/|$)/;

const getOwnHost = (): string | undefined => {
  try {
    return new URL(environmentVariables.NEXT_PUBLIC_APP_HOST_URL).host;
  } catch {
    return undefined;
  }
};

const normalisePath = (path: string): string => {
  const withoutQuery = path.split(/[?#]/)[0] ?? '';
  const withoutLocale = withoutQuery.replace(localePrefix, '');
  const withoutTrailingSlash = withoutLocale.replace(/\/+$/, '');
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
};

/**
 * Whether a menu link points at the page the user is on. The locale prefix does not count, so
 * `/fr/app/chat` is the chat entry, and neither do query and hash.
 *
 * @param pathname the current pathname, as `usePathname` returns it
 * @param href the link of the menu entry; absolute URLs never match
 * @param matchNested whether a page below the link counts too, like a chat under `/app/chat`
 * @param ownHost the host of this deployment; an absolute link to it, as editors paste them into
 *   custom links, counts like a relative one
 * @returns true when the entry is the current page
 */
export const isCurrentMenuPath = (
  pathname: string,
  href: string,
  matchNested: boolean,
  ownHost?: string,
): boolean => {
  let targetPath = href;
  if (!href.startsWith('/') || href.startsWith('//')) {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return false;
    }
    if (ownHost === undefined || url.host !== ownHost) return false;
    targetPath = url.pathname;
  }
  const current = normalisePath(pathname);
  const target = normalisePath(targetPath);
  if (current === target) return true;
  return matchNested && target !== '/' && current.startsWith(`${target}/`);
};

/**
 * A link in the main menu that marks itself as the current page: `aria-current="page"` and the
 * soft tint behind the row.
 */
export const MenuLink: React.FC<{
  href: string;
  openInNewTab?: boolean;
  prefetch?: boolean;
  matchNested?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ href, openInNewTab = false, prefetch, matchNested = false, className, children }) => {
  const pathname = usePathname();
  const isCurrent = isCurrentMenuPath(pathname, href, matchNested, getOwnHost());

  return (
    <LinkComponent
      href={href}
      openInNewTab={openInNewTab}
      {...(prefetch === undefined ? {} : { prefetch })}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn('closeNavOnClick', className, isCurrent && 'bg-tint hover:bg-tint')}
    >
      {children}
    </LinkComponent>
  );
};
