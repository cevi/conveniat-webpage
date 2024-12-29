'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Languages } from 'lucide-react';

/**
 * Simple Drop Down Menu that allows to switch between languages.
 *
 * This is a client component.
 *
 */
export const LanguageSwitcher: React.FC = () => {
  // State to toggle the visibility of the language buttons
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  const route = useRouter();
  const pathname = usePathname();

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
      <button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-[focus]:bg-white/10">
        <Languages
          className="cursor-pointer"
          onClick={() => setShowLanguageOptions(!showLanguageOptions)}
        />
        Sprache
      </button>

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
