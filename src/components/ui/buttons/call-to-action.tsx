import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const CallToAction: React.FC<{
  children?: React.ReactNode;
  href: string | undefined;
}> = ({ children, href }) => {
  if (href == undefined) return;

  const isExternal = href.includes('http') || href.includes('www');

  return (
    <div className="mt-[16px] mb-[24px] flex h-fit min-h-full justify-end">
      <Link href={href}>
        <button className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 hover:bg-red-800">
          {isExternal && (
            <span className="inline-flex items-center gap-2">
              {children}
              {<ExternalLink aria-hidden="true" className="size-5" />}
            </span>
          )}
          {!isExternal && <>{children}</>}
        </button>
      </Link>
    </div>
  );
};
