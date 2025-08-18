'use client';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';
import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Accordion } from '@radix-ui/react-accordion';
import { Check, ChevronRight, Search, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type { ChangeEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';

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

const alertTriggeredText: StaticTranslationString = {
  de: 'Alarm ausgelöst!',
  en: 'Alert triggered!',
  fr: 'Alerte déclenchée!',
};

const alarmText: StaticTranslationString = {
  de: 'Alarmieren',
  en: 'Alert',
  fr: 'Alerter',
};

const emergencyTitle: StaticTranslationString = {
  de: 'Notfall und Alarmierung',
  en: 'Emergency and Alert',
  fr: 'Urgence et Alerte',
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

interface ConfirmationSliderProperties {
  onConfirm: () => void;
  text?: string;
  confirmedText?: string;
}

const ConfirmationSlider: React.FC<ConfirmationSliderProperties> = ({
  onConfirm,
  text = 'Slide to confirm',
  confirmedText = 'Confirmed!',
}) => {
  const trackReference = useRef<HTMLDivElement>(null);
  const handleReference = useRef<HTMLDivElement>(null);
  const isDraggingReference = useRef(false);
  const startXReference = useRef(0);
  const currentTranslateXReference = useRef(0);

  const [isConfirmed, setIsConfirmed] = useState(false);

  const resetSlider = useCallback(() => {
    if (!handleReference.current || isConfirmed) return;
    handleReference.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    handleReference.current.style.transform = 'translateX(0px)';
    trackReference.current?.style.setProperty('--translate-x-clamped', '0px');
    setTimeout(() => {
      if (handleReference.current) {
        handleReference.current.style.transition = '';
      }
    }, 400);
  }, [isConfirmed]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDraggingReference.current || !trackReference.current || isConfirmed) return;

      const deltaX = event.clientX - startXReference.current;
      const handleWidth = handleReference.current?.offsetWidth ?? 64;
      const trackWidth = trackReference.current.offsetWidth;
      const maxTranslateX = trackWidth - handleWidth - 8;
      const clampedTranslateX = Math.min(Math.max(0, deltaX), maxTranslateX);

      currentTranslateXReference.current = clampedTranslateX;

      if (handleReference.current) {
        handleReference.current.style.transform = `translateX(${clampedTranslateX}px)`;
      }
      trackReference.current.style.setProperty('--translate-x-clamped', `${clampedTranslateX}px`);
    },
    [isConfirmed],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingReference.current || !trackReference.current || isConfirmed) return;
    isDraggingReference.current = false;

    const handleWidth = handleReference.current?.offsetWidth ?? 64;
    const trackWidth = trackReference.current.offsetWidth;
    const triggerThreshold = trackWidth - handleWidth - 8;

    if (currentTranslateXReference.current >= triggerThreshold) {
      setIsConfirmed(true);
      onConfirm();
    } else {
      resetSlider();
    }

    globalThis.removeEventListener('pointermove', handlePointerMove);
    globalThis.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, onConfirm, resetSlider, isConfirmed]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingReference.current || isConfirmed) return;
      isDraggingReference.current = true;
      startXReference.current = event.clientX;

      if (handleReference.current) {
        handleReference.current.style.transition = '';
      }

      globalThis.addEventListener('pointermove', handlePointerMove);
      globalThis.addEventListener('pointerup', handlePointerUp);
    },
    [handlePointerMove, handlePointerUp, isConfirmed],
  );

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <div
        ref={trackReference}
        className={`relative flex h-16 cursor-grab items-center rounded-full px-2 transition-all duration-500 ${
          isConfirmed ? 'bg-green-700 shadow-lg shadow-green-200' : 'bg-red-600 hover:bg-red-500'
        }`}
        onPointerDown={handlePointerDown}
      >
        {!isConfirmed && (
          <div className="absolute left-2 h-12 w-12 animate-ping rounded-full bg-white/30 opacity-75"></div>
        )}

        <div
          ref={handleReference}
          className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 ${
            isConfirmed ? 'absolute right-2' : 'absolute left-2'
          }`}
          style={isConfirmed ? { transform: 'translateX(0px)' } : undefined}
        >
          {!isConfirmed && (
            <div className="absolute inset-0 animate-pulse rounded-full bg-gray-200 opacity-50"></div>
          )}

          {isConfirmed ? (
            <Check className="relative z-10 text-green-500" size={24} />
          ) : (
            <ChevronRight className="relative z-10 text-gray-600" size={24} />
          )}
        </div>

        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 transform text-lg font-medium text-white transition-all duration-300 ${
            isConfirmed ? 'opacity-100' : ''
          }`}
          style={
            isConfirmed
              ? undefined
              : {
                  opacity: `calc(1 - (clamp(0, var(--translate-x-clamped), 60px) / 60px))`,
                }
          }
        >
          {isConfirmed ? confirmedText : text}
        </div>
      </div>
    </div>
  );
};

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

  const handleAlarmTrigger = (): void => {
    alert(alertTriggeredText[locale]);
  };

  return (
    <article className="mx-auto mt-16 w-full max-w-3xl px-4">
      <HeadlineH1 className="text-center">{emergencyTitle[locale]}</HeadlineH1>

      <div className="pb-4">
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
      <div className="fixed bottom-20 w-full select-none">
        <ConfirmationSlider
          confirmedText="Alarm Ausgelöst"
          onConfirm={handleAlarmTrigger}
          text={alarmText[locale]}
        />
      </div>
    </article>
  );
};
