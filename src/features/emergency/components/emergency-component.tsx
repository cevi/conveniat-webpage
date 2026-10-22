'use client';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import type { EmergencyCardDto } from '@/features/emergency/api/emergency-card-dto';
import { EmergencyCardsSkeleton } from '@/features/emergency/components/emergency-cards-skeleton';
import { ConfirmationSlider } from '@/features/emergency/components/slide-to-confirm';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { withLocaleParameter } from '@/features/payload-cms/payload-cms/utils/document-download-name';
import type { EmergencyCard } from '@/features/payload-cms/payload-types';
import { ChatStatus, SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatMembershipPermission, ChatType, MessageEventType } from '@prisma/client';
import { Accordion } from '@radix-ui/react-accordion';
import { AnimatePresence, motion } from 'framer-motion';
import { BriefcaseMedical, Download, FileText, ImageIcon, SearchX } from 'lucide-react';
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
  de: 'Beschreibung',
  en: 'Description',
  fr: 'Description',
};

const procedureLabel: StaticTranslationString = {
  de: 'Vorgehen',
  en: 'Procedure',
  fr: 'Procédure',
};

const documentsHeading: StaticTranslationString = {
  de: 'Dokumente',
  en: 'Documents',
  fr: 'Documents',
};

const imagesHeading: StaticTranslationString = {
  de: 'Bilder',
  en: 'Images',
  fr: 'Images',
};

const noAlertsFound: StaticTranslationString = {
  de: 'Keine Notfallkarten gefunden',
  en: 'No emergency cards found',
  fr: 'Aucune carte d’urgence trouvée',
};

const alarmStillWorks: StaticTranslationString = {
  de: 'Im Notfall alarmierst du unten mit «Alarmieren» das Notfallteam.',
  en: 'In an emergency, slide “Alert” below to call the emergency team.',
  fr: 'En cas d’urgence, fais glisser « Alerter » ci-dessous pour appeler l’équipe d’urgence.',
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
  de: 'Kein Netz – bitte anrufen',
  en: 'No network – please call',
  fr: 'Pas de réseau – appelle',
};

const unauthenticatedStatusText: StaticTranslationString = {
  de: 'Nicht angemeldet – bitte anrufen',
  en: 'Not signed in – please call',
  fr: 'Non connecté – appelle',
};

const errorStatusText: StaticTranslationString = {
  de: 'Alarm fehlgeschlagen – bitte anrufen',
  en: 'Alert failed – please call',
  fr: 'Échec de l’alerte – appelle',
};

export const EmergencyComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // set when the alarm could not be sent; offline and logged out are read from their own state,
  // so the screen does not start with the call button and an error it then takes back
  const [showFallback, setShowFallback] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const router = useRouter();
  const emergencyQuery = trpc.emergency.newAlert.useMutation();
  const trpcUtils = trpc.useUtils();

  const { status } = useSession();

  // Fetch alert settings for offline caching and emergency number.
  // `refetchOnMount` keeps the cached value on screen while it is revalidated
  // in the background - without it the persisted cache was rendered instantly
  // but never updated again as long as the browser tab stayed alive.
  const { data: alertSettings } = trpc.emergency.getAlertSettings.useQuery(undefined, {
    refetchInterval: isOnline ? 1000 * 60 * 60 * 2 : false, // 2 hours when online
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: emergencyCards, isLoading } = trpc.emergency.getEmergencyCards.useQuery(undefined, {
    // instant render from the persisted cache, refreshed in the background
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: isOnline ? 1000 * 60 * 10 : false, // 10 minutes when online
    staleTime: 1000 * 60, // 1 minute
  });

  const directAlertSettings = trpcUtils.emergency.getAlertSettings.getData();
  const directEmergencyCards = trpcUtils.emergency.getEmergencyCards.getData();

  // Emergency phone number with robust fallback for offline mode
  const emergencyPhoneNumber =
    alertSettings?.emergencyPhoneNumber ?? directAlertSettings?.emergencyPhoneNumber ?? '112';

  // Track online/offline status and auth status
  useEffect(() => {
    const updateStatus = (): void => {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      setIsOnline(online);
      // back online and logged in, a failed alarm may be tried again
      if (online && status === 'authenticated') setShowFallback(false);
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

  // A browser may restore a query cache persisted before the procedure returned DTOs, which
  // still holds the raw Payload card, unpopulated ids included.
  const cards: (EmergencyCardDto | EmergencyCard)[] = React.useMemo(
    () => emergencyCards ?? directEmergencyCards ?? [],
    [emergencyCards, directEmergencyCards],
  );

  const [userToggles, setUserToggles] = useState<Record<string, boolean>>({});

  const expandedValues = React.useMemo(() => {
    return cards
      .filter((card) => {
        if (card.isNonMinifiable) return true;
        const cardId = `item-${card.id}`;
        if (cardId in userToggles) {
          return userToggles[cardId];
        }
        return Boolean(card.isExpandedByDefault);
      })
      .map((card) => `item-${card.id}`);
  }, [cards, userToggles]);

  const handleAccordionValueChange = (newValues: string[]): void => {
    const newOpenSet = new Set(newValues);
    setUserToggles((previousToggles) => {
      const nextToggles = { ...previousToggles };
      for (const card of cards) {
        if (card.isNonMinifiable) continue;
        const cardId = `item-${card.id}`;
        nextToggles[cardId] = newOpenSet.has(cardId);
      }
      return nextToggles;
    });
  };

  const filteredAlerts = cards.filter((card) =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const clearSearch = (): void => {
    setSearchTerm('');
  };

  const handleAlarmTrigger = async (): Promise<void> => {
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!online || status !== 'authenticated') {
      setShowFallback(true);
      throw new Error('Cannot trigger emergency alarm while offline or unauthenticated');
    }

    let location: GeolocationPosition | undefined;

    try {
      const locationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 60_000,
        });
      });

      location = await locationPromise;
    } catch (error) {
      console.warn('Failed to get location (denied or timeout):', error);
    }

    try {
      const data = await emergencyQuery.mutateAsync({
        location: location?.toJSON() as GeolocationPosition | undefined,
      });

      console.log('Emergency alert triggered successfully:', data);

      if (!data.success) {
        setShowFallback(true);
        throw new Error('Emergency alert backend reported failure');
      }

      const createdChatId = data.chatId;

      if (typeof createdChatId === 'string' && createdChatId.length > 0) {
        trpcUtils.chat.chats.setData({}, (oldChats) => {
          if (!oldChats) return oldChats;
          if (oldChats.some((c) => c.id === createdChatId)) return oldChats;
          const newChatEntry = {
            id: createdChatId,
            name: 'ALARM',
            description: undefined,
            status: ChatStatus.OPEN,
            chatType: ChatType.EMERGENCY,
            lastMessage: {
              id: `msg-${crypto.randomUUID()}`,
              senderId: SYSTEM_SENDER_ID,
              messagePreview: {
                de: 'Notfall-Alarm ausgelöst',
                en: 'Emergency alert triggered',
                fr: "Alerte d'urgence déclenchée",
              },
              createdAt: new Date(),
              status: MessageEventType.STORED,
            },
            lastUpdate: new Date(),
            unreadCount: 0,
            messageCount: 0,
            userChatPermission: ChatMembershipPermission.ADMIN,
          };
          return [newChatEntry, ...oldChats];
        });

        // Prefetch new alert chat details & messages for offline availability
        void trpcUtils.chat.chatDetails.ensureData({ chatId: createdChatId }).catch(console.warn);
        void trpcUtils.chat.infiniteMessages
          .prefetchInfinite({
            chatId: createdChatId,
            limit: 50,
            parentId: undefined,
          })
          .catch(console.warn);
      }

      // Refetch full chat list from server in background while online
      void trpcUtils.chat.chats.refetch().catch(console.warn);
      router.push(data.redirectUrl);
    } catch (error) {
      console.error('Failed to trigger emergency alert:', error);
      setShowFallback(true);
      throw error;
    }
  };

  const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  // while the session is still loading the slider shows: it falls back to the call button itself
  // if the user turns out not to be logged in
  const isLoggedOut = status === 'unauthenticated';
  const isFallbackActive = showFallback || !isOnline || isActuallyOffline || isLoggedOut;

  // Determine fallback texts
  let fallbackMessage = offlineStatusText[locale];
  if (isOnline && !isActuallyOffline && isLoggedOut) {
    fallbackMessage = unauthenticatedStatusText[locale];
  } else if (isOnline && !isActuallyOffline && showFallback) {
    // Allows distinction for API errors if showFallback is true but online+authed
    fallbackMessage = errorStatusText[locale];
  }

  const renderAccordionContent = (): React.ReactNode => {
    if (isLoading && cards.length === 0) {
      return <EmergencyCardsSkeleton />;
    }

    if (filteredAlerts.length === 0) {
      return (
        <EmptyState
          icon={searchTerm === '' ? BriefcaseMedical : SearchX}
          title={noAlertsFound[locale]}
          // the cards are only a guide; the alarm below works without them
          description={alarmStillWorks[locale]}
        />
      );
    }

    return filteredAlerts.map((alert) => {
      const isNonMinifiable = Boolean(alert.isNonMinifiable);

      return (
        <AccordionItem
          value={`item-${alert.id}`}
          key={alert.id}
          disabled={isNonMinifiable}
          className="border-line overflow-hidden rounded-[14px] border bg-white px-3.5"
        >
          <AccordionTrigger
            disabled={isNonMinifiable}
            className={cn(
              'min-h-[60px] py-2.5 hover:no-underline [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-green-500',
              isNonMinifiable && 'cursor-default [&>svg:last-child]:hidden',
            )}
          >
            <div className="flex w-full items-center gap-3 pr-3 text-left">
              {/* red is the emergency colour, and this is the emergency screen */}
              <div className="bg-danger-soft text-danger flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]">
                <BriefcaseMedical className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-heading text-heading text-base leading-5 font-bold">
                  {alert.title}
                </span>
                {!isNonMinifiable && (
                  <span className="mt-px text-[13px] font-normal text-green-700">
                    {tapForDetailsText[locale]}
                  </span>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-1 pb-4 text-[15px] text-green-900">
            <div>
              <SectionLabel as="h3" className="mb-1">
                {descriptionLabel[locale]}
              </SectionLabel>
              <p className="leading-relaxed break-words">{alert.description}</p>
            </div>

            {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
            {alert.procedure?.root?.children && alert.procedure.root.children.length > 0 && (
              <div>
                <SectionLabel as="h3" className="mb-1">
                  {procedureLabel[locale]}
                </SectionLabel>
                <div className="prose prose-sm prose-p:text-green-900 prose-li:text-green-900 max-w-none text-[15px] leading-relaxed text-green-900">
                  <LexicalRichTextSection richTextSection={alert.procedure} locale={locale} />
                </div>
              </div>
            )}

            {alert.documents && alert.documents.length > 0 && (
              <div className="border-line border-t pt-3">
                <SectionLabel as="h3" className="mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {documentsHeading[locale]}
                </SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {alert.documents.map((documentOrId) => {
                    if (typeof documentOrId === 'string') return;
                    const title = (documentOrId.title ?? '').trim();
                    const displayName = title === '' ? documentOrId.filename || 'Document' : title;
                    return (
                      <a
                        key={documentOrId.id}
                        href={
                          typeof documentOrId.url === 'string'
                            ? withLocaleParameter(documentOrId.url, locale)
                            : undefined
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-rail hover:bg-quiet inline-flex min-h-11 items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-sm font-semibold text-green-900 transition-colors"
                      >
                        <Download className="h-4 w-4 text-green-700" aria-hidden="true" />
                        <span>{displayName}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {alert.images && alert.images.length > 0 && (
              <div className="border-line border-t pt-3">
                <SectionLabel as="h3" className="mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {imagesHeading[locale]}
                </SectionLabel>
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

                    let captionText: string | undefined;
                    switch (locale) {
                      case 'de': {
                        captionText = imgOrId.imageCaption_de ?? undefined;

                        break;
                      }
                      case 'en': {
                        captionText = imgOrId.imageCaption_en ?? undefined;

                        break;
                      }
                      case 'fr': {
                        captionText = imgOrId.imageCaption_fr ?? undefined;

                        break;
                      }
                      // No default
                    }

                    return (
                      <div
                        key={imgOrId.id}
                        className="group border-line bg-quiet relative overflow-hidden rounded-xl border"
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
                          <div className="border-line truncate border-t bg-white p-1.5 text-center text-xs text-green-700">
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
      );
    });
  };

  return (
    <article className="mx-auto w-full max-w-2xl px-4 pt-4 pb-6">
      <div className="space-y-4">
        {cards.length > 3 && (
          <div>
            <div>
              <AppSearchBar
                placeholder={searchPlaceholder[locale]}
                value={searchTerm}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(event.target.value)
                }
                onClear={clearSearch}
                onPage
              />
            </div>
          </div>
        )}

        <Accordion
          type="multiple"
          value={expandedValues}
          onValueChange={handleAccordionValueChange}
          className="mb-28 flex flex-col gap-2.5"
        >
          {renderAccordionContent()}
        </Accordion>

        <div className="fixed bottom-20 left-0 w-full select-none xl:left-[480px] xl:w-[calc(100%-480px)]">
          <AnimatePresence mode="popLayout">
            {isFallbackActive ? (
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
                <p className="text-center text-[15px] font-semibold text-green-900">
                  {fallbackMessage}
                </p>
                <a
                  href={`tel:${emergencyPhoneNumber}`}
                  className="flex h-16 w-full items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white hover:bg-red-700"
                >
                  {offlineCallText[locale]}: {emergencyPhoneNumber}
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
