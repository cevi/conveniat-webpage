'use client';
import React, { useState } from 'react';
import { Menu, Languages } from 'lucide-react';

export const NavComponent: React.FC = () => {
  // State to toggle the visibility of the language buttons
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  // Function to handle language change (just for demonstration)
  const handleLanguageChange = (lang: string) => {
    console.log('Need to change to ' + lang);
    // You could add logic to actually change the language here (e.g., i18n)
    setShowLanguageOptions(false); // Close the language options after selection
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
