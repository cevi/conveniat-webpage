import { environmentVariables } from '@/config/environment-variables';
import { cn } from '@/utils/tailwindcss-override';
import { ExternalLink } from 'lucide-react';
import type { LinkProps } from 'next/link';
import Link from 'next/link';
import type React from 'react';

const isExternalURL = (url: string): boolean => {
  // mailto and tel links are always external
  if (url.startsWith('mailto:') || url.startsWith('tel:')) {
    return true;
  }

  // url is always internal if it doesn't start with http or https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  let environmentHost = '';
  try {
    environmentHost = new URL(environmentVariables.NEXT_PUBLIC_APP_HOST_URL).host;
  } catch {
    // If NEXT_PUBLIC_APP_HOST_URL is missing or invalid, default to empty host
  }

  const currentHost =
    // this might be undefined in some environments, e.g. during server-side rendering
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    globalThis?.location === undefined ? environmentHost : globalThis.location.host;

  // check if url is external by comparing the host
  try {
    const urlHost = new URL(url).host;
    return urlHost !== environmentHost && urlHost !== currentHost;
  } catch {
    // If the URL fails to parse but starts with http/https,
    // it is likely a malformed external URL (e.g. from CMS input).
    // Treat it as external and let the browser handle it, preventing server crash.
    return true;
  }
};

/**
 * Whether a link points at an API route of this deployment, like a Payload file URL. Those answer
 * with a file, not a page, so the router has nothing to prefetch or to navigate to.
 *
 * @param url the href of the link, relative or absolute
 * @returns true for `/api/...` on this deployment
 */
export const isApiURL = (url: string): boolean => {
  if (isExternalURL(url)) return false;
  if (url.startsWith('/')) return url.startsWith('/api/');

  // Payload stores file URLs with the server URL in front
  try {
    return new URL(url).pathname.startsWith('/api/');
  } catch {
    return false;
  }
};

// what next/link takes on top of an anchor, and an anchor must not receive
const ROUTER_ONLY_PROPERTIES = new Set<string>([
  'href',
  'as',
  'replace',
  'scroll',
  'shallow',
  'passHref',
  'prefetch',
  'locale',
  'legacyBehavior',
  'onNavigate',
  'transitionTypes',
] satisfies (keyof LinkProps)[]);

export const LinkComponent: React.FC<
  {
    children?: React.ReactNode;
    openInNewTab?: boolean;
    className?: string;
    hideExternalIcon?: boolean;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement> &
    LinkProps
> = ({
  children,
  className = '',
  openInNewTab = false,
  hideExternalIcon = false,
  ...properties
}) => {
  const { href } = properties;
  const defaultArguments = {
    ...properties,
    className: cn(
      '', // fill generic link classNames here.
      className,
    ),
    target: openInNewTab ? '_blank' : '_self',
  };

  const url = href.toString();

  const isExternal = isExternalURL(url) && !hideExternalIcon;

  if (isExternal) {
    return (
      <Link {...defaultArguments}>
        <span className="inline-flex items-center gap-1">
          {children}
          <ExternalLink aria-hidden="true" className="size-4" />
        </span>
      </Link>
    );
  }

  if (isApiURL(url)) {
    // next/link would prefetch the file as soon as the link scrolls into view
    const anchorProperties = Object.fromEntries(
      Object.entries(defaultArguments).filter(([key]) => !ROUTER_ONLY_PROPERTIES.has(key)),
    );

    return (
      <a href={url} {...anchorProperties}>
        {children}
      </a>
    );
  }

  return <Link {...defaultArguments}>{children}</Link>;
};
