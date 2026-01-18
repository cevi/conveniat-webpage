import { LinkComponent } from '@/components/ui/link-component';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const CallToAction: React.FC<{
  children?: React.ReactNode;
  href: string | undefined;
  inverted?: boolean;
  useMargin?: boolean;
}> = ({ children, href, inverted = false, useMargin = true }) => {
  if (href === undefined) return;

  const containerClasses = cn('flex h-fit min-h-full justify-end', useMargin && 'mt-4 mb-6');

  if (inverted) {
    return (
      <div className={containerClasses}>
        <LinkComponent href={href} hideExternalIcon>
          <button className="font-heading cursor-pointer rounded-[8px] border-red-700 bg-none px-8 py-3 text-center text-lg leading-normal font-bold text-red-700 outline-2 duration-100 hover:border-red-800 hover:text-red-800">
            {children}
          </button>
        </LinkComponent>
      </div>
    );
  }
  return (
    <div className={containerClasses}>
      <LinkComponent href={href} hideExternalIcon>
        <button className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800">
          {children}
        </button>
      </LinkComponent>
    </div>
  );
};
