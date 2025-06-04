import { LinkComponent } from '@/components/ui/Link';
import React from 'react';

export const CallToAction: React.FC<{
  children?: React.ReactNode;
  href: string | undefined;
}> = ({ children, href }) => {
  if (href == undefined) return;

  return (
    <div className="mt-[16px] mb-[24px] flex h-fit min-h-full justify-end">
      <LinkComponent href={href}>
        <button className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 hover:bg-red-800">
          {children}
        </button>
      </LinkComponent>
    </div>
  );
};
