import React from 'react';
import Link from 'next/link';

export const CallToAction: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="mb-20 flex h-fit min-h-full justify-end">
      <Link href="/public">
        <button className="rounded-[5px] bg-conveniat-green-500 px-12 py-4 text-center font-heading text-lg font-bold leading-normal text-[#f3f3f3] hover:bg-conveniat-green-600">
          {children}
        </button>
      </Link>
    </div>
  );
};
