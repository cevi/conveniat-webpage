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

  const environmentHost = new URL(environmentVariables.NEXT_PUBLIC_APP_HOST_URL).host;
  const currentHost =
    // this might be undefined in some environments, e.g. during server-side rendering
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    globalThis?.location === undefined ? environmentHost : globalThis.location.host;

  // check if url is external by comparing the host
  const urlHost = new URL(url).host;
  return urlHost !== environmentHost && urlHost !== currentHost;
};

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

  return <Link {...defaultArguments}>{children}</Link>;
};
