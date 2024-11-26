import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import React from 'react';

export const HeaderComponent: React.FC = () => {
  return (
    <header className="sticky left-0 top-0 mb-6 h-[56px] w-full bg-conveniat-green-300 text-conveniat-green-500">
      <div className="flex items-center justify-between px-6">
        <Link href="/">
          <Image
            src="/favicon-96x96.png"
            alt="Conveniat 2027 Logo"
            width={75}
            height={75}
            className="absolute left-[20px] top-[10px]"
          />
        </Link>
        <span className="flex items-center space-x-2 font-heading text-[26px] font-bold leading-[56px]">
          Conveniat 2027
        </span>
        <Menu />
      </div>
    </header>
  );
};
