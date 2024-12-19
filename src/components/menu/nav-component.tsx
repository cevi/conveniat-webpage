'use client';

import React, { useState } from 'react';
import { Languages, Menu } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export const NavComponent: React.FC = () => {
  const route = useRouter();
  const pathname = usePathname();

  // State to toggle the visibility of the language buttons
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  const handleLanguageChange = (lang: string): void => {
    setShowLanguageOptions(false);

    const langRegex = /^\/(de|en|fr)\//;
    if (langRegex.test(pathname)) {
      route.push(pathname.replace(langRegex, `/${lang}/`));
    } else {
      route.push(`/${lang}/${pathname.replace(/\/(de|en|fr)\/?$/, '')}`);
    }
  };

  return (
    <>
      <Languages
        className="absolute right-[45px] top-[22px] cursor-pointer"
        onClick={() => setShowLanguageOptions(!showLanguageOptions)}
      />
      <Menu className="absolute right-[21px] top-[22px]" />

      {/* Show language options when `showLanguageOptions` is true */}
      {showLanguageOptions && (
        <div className="absolute right-[45px] top-[50px] flex flex-col gap-2 rounded bg-white p-3 shadow-lg">
          <button
            className="px-4 py-2 hover:bg-gray-200"
            onClick={() => handleLanguageChange('de')}
          >
            Deutsch
          </button>
          <button
            className="px-4 py-2 hover:bg-gray-200"
            onClick={() => handleLanguageChange('en')}
          >
            English
          </button>
          <button
            className="px-4 py-2 hover:bg-gray-200"
            onClick={() => handleLanguageChange('fr')}
          >
            Français
          </button>
        </div>
      )}
    </>
  );
};
