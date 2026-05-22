'use client';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { ConfirmationSlider } from '@/features/emergency/components/slide-to-confirm';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { EmergencyCard } from '@/features/payload-cms/payload-types';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Accordion } from '@radix-ui/react-accordion';
import { AnimatePresence, motion } from 'framer-motion';
import { BriefcaseMedical, Download, FileText, ImageIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';

const tapForDetailsText: StaticTranslationString = {
  de: 'Tippe für Details',
  en: 'Tap for details',
  fr: 'Appuyez pour plus de détails',
};

const searchPlaceholder: StaticTranslationString = {
  de: 'Alarmtypen suchen',
  en: 'Search alert types',
  fr: "Rechercher types d'alerte",
};

const descriptionLabel: StaticTranslationString = {
  de: 'Beschreibung:',
  en: 'Description:',
  fr: 'Description:',
};

const procedureLabel: StaticTranslationString = {
  de: 'Vorgehen:',
  en: 'Procedure:',
  fr: 'Procédure:',
};

const documentsHeading: StaticTranslationString = {
  de: 'Zusätzliche Dokumente (PDFs):',
  en: 'Additional Documents (PDFs):',
  fr: 'Documents supplémentaires (PDFs):',
};

const imagesHeading: StaticTranslationString = {
  de: 'Verknüpfte Bilder:',
  en: 'Linked Images:',
  fr: 'Images liées:',
};

const noAlertsFound: StaticTranslationString = {
  de: 'Keine Notfallkarten gefunden.',
  en: 'No emergency cards found.',
  fr: 'Aucune carte d’urgence trouvée.',
};

const alarmText: StaticTranslationString = {
  de: 'Alarmieren',
  en: 'Alert',
  fr: 'Alerter',
};

const alarmConfirmedText: StaticTranslationString = {
  de: 'Alarm wurde ausgelöst',
  en: 'Alarm triggered',
  fr: 'Alerte déclenchée',
};

const alarmPendingText: StaticTranslationString = {
  de: 'Alarm wird ausgelöst...',
  en: 'Triggering alarm...',
  fr: "Déclenchement de l'alerte...",
};

const offlineCallText: StaticTranslationString = {
  de: 'Notfall anrufen',
  en: 'Call Emergency',
  fr: "Appeler l'urgence",
};

const offlineStatusText: StaticTranslationString = {
  de: 'Kein Netz - Bitte anrufen:',
  en: 'No network - Please call:',
  fr: 'Pas de réseau - Veuillez appeler:',
};

const unauthenticatedStatusText: StaticTranslationString = {
  de: 'Nicht angemeldet - Bitte anrufen:',
  en: 'Not signed in - Please call:',
  fr: 'Non connecté - Veuillez appeler:',
};

const errorStatusText: StaticTranslationString = {
  de: 'Fehler - Bitte anrufen:',
  en: 'Error - Please call:',
  fr: 'Erreur - Veuillez appeler:',
};

export const EmergencyComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFallback, setShowFallback] = useState(true);
  const [isOnline, setIsOnline] = useState(true); // Default to true (optimistic)
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const router = useRouter();
  const emergencyQuery = trpc.emergency.newAlert.useMutation();
  const trpcUtils = trpc.useUtils();

  const { status } = useSession();

  // Fetch alert settings for offline caching and emergency number
  const { data: alertSettings } = trpc.emergency.getAlertSettings.useQuery(undefined, {
    refetchInterval: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch dynamic emergency cards from Payload CMS
  const { data: emergencyCards, isLoading } = trpc.emergency.getEmergencyCards.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Track online/offline status and auth status
  useEffect(() => {
    const updateStatus = (): void => {
      const online = navigator.onLine;
      setIsOnline(online);
      const isAuthenticated = status === 'authenticated';

      if (!online || !isAuthenticated) {
        setShowFallback(true);
      } else {
        setShowFallback(false);
      }
    };

    // Initial check
    updateStatus();

    globalThis.addEventListener('online', updateStatus);
    globalThis.addEventListener('offline', updateStatus);

    return (): void => {
      globalThis.removeEventListener('online', updateStatus);
      globalThis.removeEventListener('offline', updateStatus);
    };
  }, [status]);

  const cards: EmergencyCard[] = emergencyCards ?? [];

  const filteredAlerts = cards.filter((card) =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const clearSearch = (): void => {
    setSearchTerm('');
  };

  const handleAlarmTrigger = async (): Promise<void> => {
    let location: GeolocationPosition | undefined;

    // TODO: the alert should also be send if the user is not signed in
    //       what do we do in this case? create a temporary guest user?

    try {
      const locationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });

      location = await locationPromise;
    } catch (error) {
      console.warn('Failed to get location (denied or timeout):', error);
    }

    const response = emergencyQuery.mutate(
      {
        location: location?.toJSON() as GeolocationPosition | undefined,
      },
      {
        onSuccess: (data) => {
          console.log('Emergency alert triggered successfully:', data);

          if (!data.success) {
            console.error('Failed to trigger emergency alert:', response);
            return;
          }

          trpcUtils.chat.chats
            .invalidate()
            .then(() => router.push(data.redirectUrl))
            .catch(console.error);
        },
        onError: (error) => {
          console.error('Failed to trigger emergency alert:', error);
          setShowFallback(true);
        },
      },
    );
  };

  // Determine fallback texts
  let fallbackMessage = offlineStatusText[locale];
  if (isOnline && status !== 'authenticated') {
    fallbackMessage = unauthenticatedStatusText[locale];
  } else if (isOnline && status === 'authenticated' && showFallback) {
    // Allows distinction for API errors if showFallback is true but online+authed
    fallbackMessage = errorStatusText[locale];
  }

  const renderAccordionContent = (): React.ReactNode => {
    if (isLoading) {
      return Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="animate-pulse overflow-hidden rounded-2xl bg-white px-4 py-5 shadow-sm"
        >
          <div className="flex w-full items-center gap-4 pr-4">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="h-3 w-1/4 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ));
    }

    if (filteredAlerts.length === 0) {
      return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 py-8 text-center text-gray-500 shadow-sm">
          {noAlertsFound[locale]}
        </div>
      );
    }

    return filteredAlerts.map((alert) => (
      <AccordionItem
        value={`item-${alert.id}`}
        key={alert.id}
        className="overflow-hidden rounded-2xl border-none bg-white px-4 shadow-sm"
      >
        <AccordionTrigger className="py-4 hover:no-underline [&>svg]:h-8 [&>svg]:w-8 [&>svg]:rounded-xl [&>svg]:bg-gray-100 [&>svg]:p-1.5 [&>svg]:text-gray-600">
          <div className="flex w-full items-center gap-4 pr-4 text-left">
            <div className="shrink-0 rounded-xl bg-gray-100 p-2.5">
              <BriefcaseMedical className="h-6 w-6 text-gray-700" />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-lg font-bold text-gray-900">{alert.title}</span>
              <span className="text-sm font-normal text-gray-500">{tapForDetailsText[locale]}</span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-gray-600">
          <div className="text-gray-800">
            <strong className="mb-1 block text-xs font-bold tracking-wider text-gray-500 uppercase">
              {descriptionLabel[locale]}
            </strong>
            <p className="text-sm leading-relaxed">{alert.description}</p>
          </div>

          {alert.procedure.root.children.length > 0 && (
            <div className="text-gray-800">
              <strong className="mb-1 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                {procedureLabel[locale]}
              </strong>
              <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                <LexicalRichTextSection richTextSection={alert.procedure} locale={locale} />
              </div>
            </div>
          )}

          {alert.documents && alert.documents.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <strong className="mb-2 block flex items-center gap-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                {documentsHeading[locale]}
              </strong>
              <div className="flex flex-wrap gap-2">
                {alert.documents.map((documentOrId) => {
                  if (typeof documentOrId === 'string') return;
                  const displayName =
                    documentOrId.internalDescription || documentOrId.filename || 'Document';
                  return (
                    <a
                      key={documentOrId.id}
                      href={documentOrId.url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
                    >
                      <Download className="h-3.5 w-3.5 text-gray-500" />
                      <span>{displayName}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {alert.images && alert.images.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <strong className="mb-2 block flex items-center gap-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
                {imagesHeading[locale]}
              </strong>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {alert.images.map((imgOrId) => {
                  if (typeof imgOrId === 'string') return;

                  let altText = imgOrId.filename || 'Image';
                  switch (locale) {
                    case 'de': {
                      altText = imgOrId.alt_de;

                      break;
                    }
                    case 'en': {
                      altText = imgOrId.alt_en;

                      break;
                    }
                    case 'fr': {
                      altText = imgOrId.alt_fr;

                      break;
                    }
                    // No default
                  }

                  let captionText = imgOrId.imageCaption_de ?? undefined;
                  if (locale === 'de' && imgOrId.imageCaption_de) {
                    captionText = imgOrId.imageCaption_de;
                  } else if (locale === 'en' && imgOrId.imageCaption_en) {
                    captionText = imgOrId.imageCaption_en;
                  } else if (locale === 'fr' && imgOrId.imageCaption_fr) {
                    captionText = imgOrId.imageCaption_fr;
                  }

                  return (
                    <div
                      key={imgOrId.id}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                    >
                      <a
                        href={imgOrId.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden"
                      >
                        <img
                          src={imgOrId.url ?? undefined}
                          alt={altText}
                          className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </a>
                      {captionText && (
                        <div className="truncate border-t border-gray-100 bg-white p-1.5 text-center text-[10px] text-gray-500">
                          {captionText}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    ));
  };

  return (
    <article className="container mx-auto mt-8 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-8">
        <div className="pb-4">
          <div className="mb-2">
            <AppSearchBar
              placeholder={searchPlaceholder[locale]}
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
              onClear={clearSearch}
            />
          </div>
        </div>

        <Accordion type="single" collapsible className="mb-20 flex flex-col gap-4">
          {renderAccordionContent()}
        </Accordion>

        <div className="fixed bottom-20 left-0 w-full select-none xl:left-[480px] xl:w-[calc(100%-480px)]">
          <AnimatePresence mode="popLayout">
            {showFallback && alertSettings?.emergencyPhoneNumber ? (
              <motion.div
                key="fallback"
                layout
                layoutId="emergency-toggle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                className="mx-auto w-full max-w-md space-y-2 p-4"
              >
                <p className="text-center text-sm font-medium text-gray-600">{fallbackMessage}</p>
                <a
                  href={`tel:${alertSettings.emergencyPhoneNumber}`}
                  className="flex h-16 w-full items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white shadow-md hover:bg-red-700"
                >
                  {offlineCallText[locale]}: {alertSettings.emergencyPhoneNumber}
                </a>
              </motion.div>
            ) : (
              <motion.div
                key="slider"
                layout
                layoutId="emergency-toggle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              >
                <ConfirmationSlider
                  onConfirm={handleAlarmTrigger}
                  text={alarmText[locale]}
                  confirmedText={alarmConfirmedText[locale]}
                  pendingText={alarmPendingText[locale]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </article>
  );
};
