'use client';
import { environmentVariables } from '@/config/environment-variables';
import { cn } from '@/utils/tailwindcss-override';
import { ExternalLink } from 'lucide-react';
import type { LinkProps } from 'next/link';
import Link from 'next/link';
import type React from 'react';

const isExternalURL = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url); // base needed for relative URLs

    const environmentHost = new URL(environmentVariables.NEXT_PUBLIC_APP_HOST_URL).host;

    const currentHost =
      typeof globalThis === 'undefined' ? environmentHost : globalThis.location.host;

    return parsedUrl.host !== currentHost && parsedUrl.protocol.startsWith('http');
  } catch {
    // Fallback for malformed URLs or unusual inputs
    return false;
  }
};

export const LinkComponent: React.FC<
  {
    children?: React.ReactNode;
    openInNewTab?: boolean;
    className?: string;
  } & LinkProps
> = ({ children, className = '', openInNewTab = false, ...linkProperties }) => {
  const { href } = linkProperties;
  const defaultArguments = {
    ...linkProperties,
    className: cn(
      '', // fill generic link classNames here.
      className,
    ),
    target: openInNewTab ? '_blank' : '_self',
  };

  const url = href.toString();

  const isExternal = isExternalURL(url);

  if (isExternal) {
    return (
      <Link {...defaultArguments}>
        <span className="inline-flex items-center gap-2">
          {children}
          <ExternalLink aria-hidden="true" className="size-5" />
        </span>
      </Link>
    );
  }

  return <Link {...defaultArguments}>{children}</Link>;
};
