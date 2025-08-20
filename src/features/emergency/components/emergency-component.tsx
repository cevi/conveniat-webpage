'use client';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { ConfirmationSlider } from '@/features/emergency/components/slide-to-confirm';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Accordion } from '@radix-ui/react-accordion';
import { Search, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import React, { useState } from 'react';

const alertTypeTranslations = {
  'Medical Emergency': {
    de: 'Medizinischer Notfall',
    en: 'Medical Emergency',
    fr: 'Urgence médicale',
  },
  Fire: {
    de: 'Feuer',
    en: 'Fire',
    fr: 'Incendie',
  },
  'Lost Camper': {
    de: 'Vermisster Teilnehmer',
    en: 'Lost Camper',
    fr: 'Campeur perdu',
  },
  'Severe Weather': {
    de: 'Schweres Wetter',
    en: 'Severe Weather',
    fr: 'Intempéries',
  },
};

const alertDescriptions = {
  'Medical Emergency': {
    de: 'Lebensbedrohliche Situationen, die sofortige medizinische Hilfe erfordern.',
    en: 'Life-threatening situations requiring immediate medical attention.',
    fr: 'Situations potentiellement mortelles nécessitant une attention médicale immédiate.',
  },
  Fire: {
    de: 'Alle feuerbezogenen Notfälle innerhalb des Lagergeländes.',
    en: 'Any fire-related emergencies within the camp premises.',
    fr: 'Toute urgence liée au feu dans les locaux du camp.',
  },
  'Lost Camper': {
    de: 'Wenn ein Teilnehmer als vermisst gemeldet wird oder nicht aufgefunden werden kann.',
    en: 'When a camper is reported missing or cannot be located.',
    fr: 'Quand un campeur est signalé disparu ou ne peut pas être localisé.',
  },
  'Severe Weather': {
    de: 'Gefährliche Wetterbedingungen wie Stürme, Blitze oder Überschwemmungen.',
    en: 'Dangerous weather conditions such as storms, lightning, or flooding.',
    fr: 'Conditions météorologiques dangereuses telles as storms, lightning, or flooding.',
  },
};

const alertProcedures = {
  'Medical Emergency': {
    de: 'Medizinische Verstärkung anfordern, Erste-Hilfe-Kasten bereitmachen, Bereich räumen.',
    en: 'Call for medical backup, prepare first aid kit, clear the area.',
    fr: 'Appeler des renforts médicaux, préparer la trousse de premiers secours, dégager la zone.',
  },
  Fire: {
    de: 'Bereich evakuieren, Feuerwehr rufen, Feuerlöscher verwenden wenn sicher.',
    en: 'Evacuate the area, call fire department, use fire extinguishers if safe.',
    fr: 'Évacuer la zone, appeler les pompiers, utiliser les extincteurs si sûr.',
  },
  'Lost Camper': {
    de: 'Suchteams organisieren, örtliche Behörden benachrichtigen, Lagerperimeter sichern.',
    en: 'Organize search parties, notify local authorities, secure camp perimeter.',
    fr: 'Organiser des équipes de recherche, aviser les autorités locales, sécuriser le périmètre du camp.',
  },
  'Severe Weather': {
    de: 'Teilnehmer in bestimmte Schutzräume bringen, Wetterupdates überwachen, Notfallvorräte bereitstellen.',
    en: 'Move campers to designated shelters, monitor weather updates, prepare emergency supplies.',
    fr: "Déplacer les campeurs vers les abris désignés, surveiller les mises à jour météo, préparer les fournitures d'urgence.",
  },
};

const searchPlaceholder: StaticTranslationString = {
  de: 'Alarmtypen suchen...',
  en: 'Search alert types...',
  fr: "Rechercher types d'alerte...",
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

const alarmText: StaticTranslationString = {
  de: 'Alarmieren',
  en: 'Alert',
  fr: 'Alerter',
};

const alertTypes = [
  {
    title: 'Medical Emergency',
    description: 'Life-threatening situations requiring immediate medical attention.',
    procedure: 'Call for medical backup, prepare first aid kit, clear the area.',
  },
  {
    title: 'Fire',
    description: 'Any fire-related emergencies within the camp premises.',
    procedure: 'Evacuate the area, call fire department, use fire extinguishers if safe.',
  },
  {
    title: 'Lost Camper',
    description: 'When a camper is reported missing or cannot be located.',
    procedure: 'Organize search parties, notify local authorities, secure camp perimeter.',
  },
  {
    title: 'Severe Weather',
    description: 'Dangerous weather conditions such as storms, lightning, or flooding.',
    procedure:
      'Move campers to designated shelters, monitor weather updates, prepare emergency supplies.',
  },
  {
    title: 'Medical Emergency',
    description: 'Life-threatening situations requiring immediate medical attention.',
    procedure: 'Call for medical backup, prepare first aid kit, clear the area.',
  },
  {
    title: 'Fire',
    description: 'Any fire-related emergencies within the camp premises.',
    procedure: 'Evacuate the area, call fire department, use fire extinguishers if safe.',
  },
  {
    title: 'Lost Camper',
    description: 'When a camper is reported missing or cannot be located.',
    procedure: 'Organize search parties, notify local authorities, secure camp perimeter.',
  },
  {
    title: 'Severe Weather',
    description: 'Dangerous weather conditions such as storms, lightning, or flooding.',
    procedure:
      'Move campers to designated shelters, monitor weather updates, prepare emergency supplies.',
  },
  {
    title: 'Medical Emergency',
    description: 'Life-threatening situations requiring immediate medical attention.',
    procedure: 'Call for medical backup, prepare first aid kit, clear the area.',
  },
  {
    title: 'Fire',
    description: 'Any fire-related emergencies within the camp premises.',
    procedure: 'Evacuate the area, call fire department, use fire extinguishers if safe.',
  },
  {
    title: 'Lost Camper',
    description: 'When a camper is reported missing or cannot be located.',
    procedure: 'Organize search parties, notify local authorities, secure camp perimeter.',
  },
  {
    title: 'Severe Weather',
    description: 'Dangerous weather conditions such as storms, lightning, or flooding.',
    procedure:
      'Move campers to designated shelters, monitor weather updates, prepare emergency supplies.',
  },
];

export const EmergencyComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const router = useRouter();
  const emergencyQuery = trpc.emergency.newAlert.useMutation();
  const trpcUtils = trpc.useUtils();

  const filteredAlerts = alertTypes.filter((alert) =>
    alertTypeTranslations[alert.title as keyof typeof alertTypeTranslations][locale]
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const clearSearch = (): void => {
    setSearchTerm('');
  };

  const handleAlarmTrigger = async (): Promise<void> => {
    // get current location
    const locationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    const location = await locationPromise;

    // TODO: the alert should also be send if the user does not allow location access
    //       or if the location cannot be determined (api call fails)
    // TODO: the alert should also be send if the user is not signed in
    //       what do we do in this case? create a temporary guest user?

    const response = emergencyQuery.mutate(
      {
        location: location.toJSON() as GeolocationPosition,
      },
      {
        onSuccess: (data) => {
          console.log('Emergency alert triggered successfully:', data);

          if (!data.success) {
            console.error('Failed to trigger emergency alert:', response);
            return;
          }

          trpcUtils.chat.chats.invalidate().catch(console.error);
          router.push(data.redirectUrl);
        },
      },
    );
  };

  return (
    <article className="container mx-auto mt-8 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-8">
        <div className="pb-4">
          <div className="mb-2">
            <div className="relative">
              <Input
                type="text"
                placeholder={searchPlaceholder[locale]}
                value={searchTerm}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(event.target.value)
                }
                className="pl-10"
              />
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
                size={20}
              />
              {searchTerm !== '' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-2 -translate-y-1/2 transform"
                  onClick={clearSearch}
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible className="mb-20">
          {filteredAlerts.map((alert, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger>
                <span className="font-semibold text-gray-900">
                  {alertTypeTranslations[alert.title as keyof typeof alertTypeTranslations][locale]}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-2 text-gray-800">
                  <strong>{descriptionLabel[locale]}</strong>{' '}
                  {alertDescriptions[alert.title as keyof typeof alertDescriptions][locale]}
                </p>
                <p className="text-gray-800">
                  <strong>{procedureLabel[locale]}</strong>{' '}
                  {alertProcedures[alert.title as keyof typeof alertProcedures][locale]}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="fixed bottom-20 left-0 w-full select-none">
          <ConfirmationSlider
            onConfirm={handleAlarmTrigger}
            text={alarmText[locale]}
            confirmedText="Alarm wurde ausgelöst"
            pendingText="Alarm wird ausgelöst..."
          />
        </div>
      </div>
    </article>
  );
};
