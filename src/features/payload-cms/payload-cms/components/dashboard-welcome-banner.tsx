'use client';

import build from '@/build';
import { environmentVariables } from '@/config/environment-variables';
import { resetServerData } from '@/features/payload-cms/payload-cms/initialization/deleting/reset-api';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';
import { useState } from 'react';

const welcomeMessageTitle: StaticTranslationString = {
  de: 'conveniat27 CMS',
  en: 'conveniat27 CMS',
  fr: 'CMS du conveniat27',
};

const welcomeMessage: StaticTranslationString = {
  de: 'Hier kannst du alle Inhalte der Webseite verwalten und bearbeiten.',
  en: 'Here you can manage and edit all the content of the website.',
  fr: 'Ici, vous pouvez gérer et modifier tout le contenu du site web.',
};

const DashboardWelcomeBanner: React.FC<{ locale: Locale }> = ({ locale = 'de' }) => {
  const [isResetting, setIsResetting] = useState(false);

  const resetHandler = async (): Promise<void> => {
    setIsResetting(true);
    try {
      await resetServerData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  const isLocalhost = environmentVariables.NEXT_PUBLIC_APP_HOST_URL.includes('localhost');

  return (
    <div className="relative">
      {isResetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white text-2xl font-semibold text-black">
          Resetting...
        </div>
      )}

      <h1 className="text-conveniat-green text-3xl font-extrabold">
        {welcomeMessageTitle[locale]} - Version {build.version}
      </h1>
      <p className="mt-2 text-lg">{welcomeMessage[locale]}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        {isLocalhost && (
          <button
            type="button"
            onClick={() => void resetHandler()}
            className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
          >
            Reset this instance
          </button>
        )}

        <button
          type="button"
          onClick={async () => {
            try {
              const response = await fetch('/api/flush-cache');
              if (response.ok) {
                alert('Cache flushed successfully!');
              } else {
                alert('Failed to flush cache.');
              }
            } catch (error) {
              console.error(error);
              alert('An error occurred while flushing cache.');
            }
          }}
          className="font-heading cursor-pointer rounded-[8px] bg-conveniat-green px-8 py-3 text-center text-lg leading-normal font-bold text-white duration-100 hover:brightness-110"
        >
          Flush Cache
        </button>
      </div>
    </div>
  );
};

export default DashboardWelcomeBanner;
