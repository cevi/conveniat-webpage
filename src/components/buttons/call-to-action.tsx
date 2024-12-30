import React from 'react';
import Link from 'next/link';

export const CallToAction: React.FC<{
  children?: React.ReactNode;
  href: string | undefined;
}> = ({ children, href }) => {
  if (href == undefined) return;

  return (
    <div className="mb-[32px] mt-[16px] flex h-fit min-h-full justify-end">
      <Link href={href}>
        <button className="rounded-[8px] bg-red-700 px-12 py-4 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800">
          {children}
        </button>
      </Link>
    </div>
  );
};
