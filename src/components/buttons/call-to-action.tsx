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
        <button className="hover:bg-conveniat-green-600 rounded-[8px] bg-green-600 px-12 py-4 text-center font-heading text-lg font-bold leading-normal text-green-100">
          {children}
        </button>
      </Link>
    </div>
  );
};
