import { faker } from '@faker-js/faker';
import type { RequiredDataFromCollectionSlug } from 'payload';

// Define the structure for our schedule entries for better type safety.
type ScheduleEntry = RequiredDataFromCollectionSlug<'camp-schedule-entry'>;

// --- Configuration ---
const CAMP_START_DATE = new Date('2027-07-26'); // Monday
const CAMP_DAYS = 6; // Monday to Saturday

/**
 * Helper to create a Lexical RichText object from plain text.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createRichText = (text: string): { root: any } => ({
  // eslint-disable-line @typescript-eslint/no-explicit-any
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 'left' as const,
            mode: 'normal' as const,
            style: '',
            text,
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'left' as const,
        indent: 0,
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: 'left' as const,
    indent: 0,
    version: 1,
  },
});

/**
 * Creates a single event object with the required structure.
 */
/**
 * Map of category keys to their MongoDB ObjectIds.
 * These IDs are obtained from seeding the camp-categories collection first.
 */
export interface CategoryIds {
  workshop: string;
  general: string;
  food: string;
  activity: string;
  other: string;
}

const createEvent = (
  title: string,
  date: string,
  time: string,
  location: string,
  organiser: string[],
  descriptionText: string,
  categoryIds: CategoryIds,
  options: {
    enrolment?: boolean;
    min?: number;
    max?: number;
    targetGroup?: string;
    category?: keyof CategoryIds;
  } = {},
): ScheduleEntry => {
  const categoryId = options.category ? categoryIds[options.category] : categoryIds.general;
  return {
    title,
    timeslot: { date, time },
    location,
    organiser,
    description: createRichText(descriptionText),
    enable_enrolment: options.enrolment ?? false,
    participants_min: options.min ?? null, // eslint-disable-line unicorn/no-null
    participants_max: options.max ?? null, // eslint-disable-line unicorn/no-null
    target_group: options.targetGroup ? createRichText(options.targetGroup) : null, // eslint-disable-line unicorn/no-null
    category: categoryId,
  };
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0] ?? '';
};

const shuffleArray = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

// --- Meaningful Entry Data Pools ---

const workshops = [
  {
    title: 'Pioniertechnik: Turmbau',
    description: 'Wir bauen gemeinsam einen Aussichtsturm aus Rundholz und Seilen.',
    targetGroup: 'Fortgeschrittene (ab 12 Jahren)',
  },
  {
    title: 'Erste Hilfe im Wald',
    description: 'Was tun bei Schnittwunden oder Zeckenbissen? Wir lernen die Grundlagen.',
    targetGroup: 'Alle Teilnehmenden',
  },
  {
    title: 'Kreatives mit Naturmaterialien',
    description: 'Wir basteln Schmuck und Deko aus dem, was der Wald uns bietet.',
    targetGroup: 'Kreative Köpfe',
  },
  {
    title: 'Fussball-Turnier',
    description: 'Das grosse Conveniat-Turnier. Wer gewinnt den Wanderpokal?',
    targetGroup: 'Sportbegeisterte',
  },
  {
    title: 'Gitarren-Crashkurs',
    description: 'Lerne die 3 wichtigsten Akkorde für jedes Lagerfeuerlied.',
    targetGroup: 'Anfänger ohne Vorkenntnisse',
  },
  {
    title: 'Kartenlesen & Orientierung',
    description: 'Wie finde ich mich ohne GPS zurecht? Karte und Kompass im Check.',
    targetGroup: 'Alle Teilnehmenden',
  },
  {
    title: 'Solares Kochen',
    description: 'Wir bauen einen Solarofen und kochen ein kleines Dessert.',
    targetGroup: 'Technik-Interessierte',
  },
  {
    title: 'Theater & Improvisation',
    description: 'Wir bereiten kleine Sketche für den Abend vor.',
    targetGroup: 'Alle, die gerne auf der Bühne stehen',
  },
  {
    title: 'Feuer machen ohne Streichhölzer',
    description: 'Die Kunst des Feuerschlagens mit Feuerstein und Stahl.',
    targetGroup: 'Outdoor-Fans',
  },
  {
    title: 'Wald-Yogа',
    description: 'Entspannung pur zwischen den Bäumen.',
    targetGroup: 'Alle, die Ruhe suchen',
  },
];

export const generateScheduleEntries = (
  campSitesId: string[],
  userIds: string[],
  categoryIds: CategoryIds,
): ScheduleEntry[] => {
  const allEvents: ScheduleEntry[] = [];
  const mainStageLocation = campSitesId[0];
  if (mainStageLocation === undefined) {
    // Changed to strict equality
    throw new Error('Main stage location is not defined in campSitesId.');
  }

  // Loop through each day of the camp
  for (let dayIndex = 0; dayIndex < CAMP_DAYS; dayIndex++) {
    const currentDate = new Date(CAMP_START_DATE);
    currentDate.setDate(currentDate.getDate() + dayIndex);
    const dateString = formatDate(currentDate);

    // Morning Block (08:00 - 12:00)
    if (dayIndex === 0) {
      // Monday arrival
      for (const siteId of campSitesId) {
        allEvents.push(
          createEvent(
            'Ankunft & Zeltbau',
            dateString,
            '10:00 - 12:00',
            siteId,
            [faker.helpers.arrayElement(userIds)],
            'Willkommen im Camp!',
            categoryIds,
            { category: 'activity' },
          ),
        );
      }
    } else if (dayIndex < CAMP_DAYS - 1) {
      // Standard morning: 08:00 Breakfast (Everywhere), 09:30 Workshops (Distributed)
      for (const siteId of campSitesId) {
        allEvents.push(
          createEvent(
            'Morgenessen',
            dateString,
            '08:00 - 09:00',
            siteId,
            [],
            'Startet gut in den Tag.',
            categoryIds,
            { category: 'food' },
          ),
        );
      }

      // Concurrent workshops at 10:00 - 12:00
      const dayWorkshops = shuffleArray(workshops).slice(0, Math.min(campSitesId.length, 5));
      for (const [index, ws] of dayWorkshops.entries()) {
        const siteId = campSitesId[index % campSitesId.length];
        if (siteId === undefined) continue; // Changed to strict equality
        allEvents.push(
          createEvent(
            ws.title,
            dateString,
            '10:00 - 12:00',
            siteId,
            [faker.helpers.arrayElement(userIds)],
            ws.description,
            categoryIds,
            {
              enrolment: true,
              min: 5,
              max: 20,
              targetGroup: ws.targetGroup,
              category: 'workshop',
            },
          ),
        );
      }
    }

    // Lunch Block (12:30 - 13:30)
    if (dayIndex < CAMP_DAYS - 1) {
      for (const siteId of campSitesId) {
        allEvents.push(
          createEvent(
            'Mittagessen',
            dateString,
            '12:30 - 13:30',
            siteId,
            [],
            'Stärkung zur Mittagszeit.',
            categoryIds,
            { category: 'food' },
          ),
        );
      }
    }

    // Afternoon Block (14:00 - 17:00)
    if (dayIndex === 0) {
      allEvents.push(
        createEvent(
          'Eröffnungsspiel',
          dateString,
          '14:30 - 16:30',
          mainStageLocation,
          [faker.helpers.arrayElement(userIds)],
          'Ein Spiel für alle.',
          categoryIds,
          { category: 'activity' },
        ),
      );
    } else if (dayIndex === 2) {
      // Wednesday Hike
      for (const siteId of campSitesId) {
        allEvents.push(
          createEvent(
            'Tageswanderung',
            dateString,
            '09:30 - 16:30',
            siteId,
            [faker.helpers.arrayElement(userIds)],
            'Ab in die Berge!',
            categoryIds,
            { category: 'activity' },
          ),
        );
      }
    } else if (dayIndex < CAMP_DAYS - 1) {
      // More workshops or games
      const afternoonWorkshops = shuffleArray(workshops).slice(0, 3);
      for (const [index, ws] of afternoonWorkshops.entries()) {
        const siteId = campSitesId[(index + 2) % campSitesId.length];
        if (!siteId) continue;
        allEvents.push(
          createEvent(
            ws.title,
            dateString,
            '14:30 - 16:30',
            siteId,
            [faker.helpers.arrayElement(userIds)],
            ws.description,
            categoryIds,
            {
              enrolment: true,
              min: 5,
              max: 25,
              targetGroup: ws.targetGroup,
              category: 'workshop',
            },
          ),
        );
      }
    }

    // Evening Block (18:30 - Close)
    if (dayIndex < CAMP_DAYS - 1) {
      for (const siteId of campSitesId) {
        allEvents.push(
          createEvent(
            'Nachtessen',
            dateString,
            '18:30 - 19:30',
            siteId,
            [],
            'Abendbrot.',
            categoryIds,
            {
              category: 'food',
            },
          ),
        );
      }
      allEvents.push(
        createEvent(
          'Plenum',
          dateString,
          '20:00 - 21:00',
          mainStageLocation,
          [faker.helpers.arrayElement(userIds)],
          'Rückblick und Infos.',
          categoryIds,
          { category: 'general' },
        ),
      );
    }

    // Final Day Saturday
    if (dayIndex === CAMP_DAYS - 1) {
      for (const siteId of campSitesId) {
        allEvents.push(
          createEvent(
            'Abschluss-Zmorge',
            dateString,
            '08:30 - 10:00',
            siteId,
            [],
            'Das letzte Frühstück.',
            categoryIds,
            { category: 'food' },
          ),
          createEvent(
            'Abbau & Reinigung',
            dateString,
            '10:30 - 13:00',
            siteId,
            [],
            'Alle helfen mit.',
            categoryIds,
            { category: 'activity' },
          ),
        );
      }
    }
  }

  return allEvents;
};
