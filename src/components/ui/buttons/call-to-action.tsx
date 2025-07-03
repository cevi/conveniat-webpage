import { LinkComponent } from '@/components/ui/link-component';
import React from 'react';

export const CallToAction: React.FC<{
  children?: React.ReactNode;
  href: string | undefined;
  inverted?: boolean;
}> = ({ children, href, inverted = false }) => {
  if (href == undefined) return;

  if (inverted) {
    return (
      <div className="mt-[16px] mb-[24px] flex h-fit min-h-full justify-end">
        <LinkComponent href={href} hideExternalIcon>
          <button className="font-heading cursor-pointer rounded-[8px] border-red-700 bg-none px-8 py-3 text-center text-lg leading-normal font-bold text-red-700 outline-2 duration-100 hover:border-red-800 hover:text-red-800">
            {children}
          </button>
        </LinkComponent>
      </div>
    );
  }
  return (
    <div className="mt-[16px] mb-[24px] flex h-fit min-h-full justify-end">
      <LinkComponent href={href} hideExternalIcon>
        <button className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800">
          {children}
        </button>
      </LinkComponent>
    </div>
  );
};
