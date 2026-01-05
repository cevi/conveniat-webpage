'use client';

import { OnboardingProcess } from '@/features/onboarding/components/onboarding-process';
import { registerServiceWorker } from '@/utils/service-worker-utils';

import React, { useEffect } from 'react';

const OnboardingPage: React.FC = () => {
  useEffect(() => {
    // Register service worker in background to speed up subsequent push subscription flow
    registerServiceWorker().catch((error: unknown) => {
      console.error('Background service worker registration failed:', error);
    });
  }, []);

  // Log Service Worker details on every render
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('[Entrypoint] Service Worker Render Log:', {
        controller: navigator.serviceWorker.controller,
        readyPromise: navigator.serviceWorker.ready,
      });

      void navigator.serviceWorker.getRegistration().then((reg) => {
        console.log('[Entrypoint] SW Registration Details:', {
          active: reg?.active,
          installing: reg?.installing,
          waiting: reg?.waiting,
          scope: reg?.scope,
        });
      });
    } else {
      console.log('[Entrypoint] Service Worker not supported');
    }
  });

  return <OnboardingProcess />;
};

export default OnboardingPage;
