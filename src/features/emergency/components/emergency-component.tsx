'use client';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Accordion } from '@radix-ui/react-accordion';
import { AlertCircle, Search, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
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
    fr: 'Conditions météorologiques dangereuses telles que tempêtes, éclairs ou inondations.',
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

const alertTriggeredText: StaticTranslationString = {
  de: 'Alarm ausgelöst!',
  en: 'Alert triggered!',
  fr: 'Alerte déclenchée!',
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

  const filteredAlerts = alertTypes.filter((alert) =>
    alertTypeTranslations[alert.title as keyof typeof alertTypeTranslations][locale]
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const clearSearch = (): void => {
    setSearchTerm('');
  };

  return (
    <article className="mx-auto mt-16 w-full max-w-3xl px-4">
      <HeadlineH1 className="text-center">Notfall und Alarmierung</HeadlineH1>

      <div className="sticky top-[80px] z-20 bg-[#f8fafc] pb-4">
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6 shadow-xs">
          <h2 className="mb-4 flex items-center justify-center text-2xl font-bold text-red-500">
            <AlertCircle className="mr-2" /> Notfall Melden
          </h2>
          <p className="mb-4 text-center text-balance text-red-500">
            In dringenden Notfällen, bitte sofort 1414 anrufen and anschliessend hier alarmieren.
          </p>
          <div className="flex justify-center">
            <Button
              className="text-red-50"
              variant="destructive"
              size="lg"
              onClick={() => alert(alertTriggeredText[locale])}
            >
              Lagersanität Alarmieren
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Input
              type="text"
              placeholder={searchPlaceholder[locale]}
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
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

      <Accordion type="single" collapsible className="mb-8">
        {filteredAlerts.map((alert, index) => (
          <AccordionItem value={`item-${index}`} key={index}>
            <AccordionTrigger>
              {alertTypeTranslations[alert.title as keyof typeof alertTypeTranslations][locale]}
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">
                <strong>{descriptionLabel[locale]}</strong>{' '}
                {alertDescriptions[alert.title as keyof typeof alertDescriptions][locale]}
              </p>
              <p>
                <strong>{procedureLabel[locale]}</strong>{' '}
                {alertProcedures[alert.title as keyof typeof alertProcedures][locale]}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </article>
  );
};
