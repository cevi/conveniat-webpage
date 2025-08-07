import { faker } from '@faker-js/faker';
import type { RequiredDataFromCollectionSlug } from 'payload';

// Define the structure for our schedule entries for better type safety.
type ScheduleEntry = RequiredDataFromCollectionSlug<'camp-schedule-entry'>;

// --- Configuration ---
const CAMP_START_DATE = new Date('2027-07-26'); // Monday
const CAMP_DAYS = 6; // Monday to Saturday

// A much larger pool of workshop titles to ensure variety.
const workshopPool: string[] = [
  'Workshop: Cevi-Plus',
  'Workshop: Cevi-Tools',
  'Workshop: Basteln mit Naturmaterialien',
  'Workshop: Effektives Rollenspiel',
  'Erste Hilfe für Fortgeschrittene',
  'Fussball-Turnier Vorrunde',
  'Knotenkunde für Lagerbauten',
  'Kartenlesen und Kompass-Navigation',
  'Lagerbauten: Pioniertechnik',
  'Spurenlesen im Wald',
  'Sichere Feuertechniken',
  'Theater & Improvisation',
  'Gitarren-Crashkurs: Lagerfeuerlieder',
  'Naturfotografie mit dem Smartphone',
  'Schnitzen für Anfänger',
  'Volleyball-Training',
  'Vertrauensspiele und Teambuilding',
  'Wetterkunde für Outdoor-Aktivitäten',
  'Nacht-OL (Orientierungslauf)',
  'Erste Hilfe im Gelände',
];

// --- Helper Functions ---

/**
 * Creates a single event object with the required structure.
 */
const createEvent = (
  title: string,
  date: string,
  time: string,
  location: string,
  organiser: string,
  descriptionText: string,
): ScheduleEntry => {
  // Same implementation as before...
  return {
    title,
    timeslot: { date, time },
    location,
    organiser,
    description: {
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
                text: descriptionText,
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
    },
  };
};

/**
 * Formats a Date object into a 'yyyy-MM-DD' string.
 */
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0] ?? '';
};

// --- Main Generation Logic ---

export const generateScheduleEntries = (
  campSitesId: string[],
  userIds: string[],
): ScheduleEntry[] => {
  const allEvents: ScheduleEntry[] = [];
  const mainStageLocation = campSitesId[0];
  if (mainStageLocation == undefined) {
    throw new Error('Main stage location is not defined in campSitesId.');
  }

  // Create a mutable copy of the workshop pool to draw from.
  const availableWorkshops = [...workshopPool];

  /**
   * Schedules a given number of workshops concurrently, assigning each to a unique location.
   */
  const scheduleConcurrentWorkshops = (date: string, time: string, count: number): void => {
    // Ensure we don't try to schedule more workshops than available campsites or titles.
    const numberToSchedule = Math.min(count, campSitesId.length, availableWorkshops.length);
    if (count > numberToSchedule) {
      console.warn(
        `Warning: Tried to schedule ${count} workshops, but only ${numberToSchedule} locations/titles are available. Adjusting.`,
      );
    }

    // Shuffle campsites to get random, unique locations for this timeslot
    const shuffledCampsites = faker.helpers.shuffle(campSitesId);

    // Pick unique workshop titles for this timeslot
    const selectedTitles: string[] = [];
    for (let index = 0; index < numberToSchedule; index++) {
      const randomIndex = Math.floor(Math.random() * availableWorkshops.length);
      selectedTitles.push(availableWorkshops.splice(randomIndex, 1)[0] ?? 'Workshop');
    }

    for (let index = 0; index < numberToSchedule; index++) {
      const title = selectedTitles[index] ?? 'Workshop';
      const location = shuffledCampsites[index] ?? mainStageLocation; // Fallback to main stage if no location is available
      allEvents.push(
        createEvent(
          title,
          date,
          time,
          location,
          faker.helpers.arrayElement(userIds),
          faker.lorem.paragraph(3), // Generate a random description
        ),
      );
    }
  };

  /**
   * Generates an event that happens at every single campsite.
   */
  const createEverywhereEventsForDay = (
    title: string,
    date: string,
    time: string,
    description: string,
  ): void => {
    // Same implementation as before...
    for (const campSiteId of campSitesId) {
      allEvents.push(
        createEvent(
          title,
          date,
          time,
          campSiteId,
          faker.helpers.arrayElement(userIds),
          description,
        ),
      );
    }
  };

  // Loop through each day of the camp
  for (let dayIndex = 0; dayIndex < CAMP_DAYS; dayIndex++) {
    const currentDate = new Date(CAMP_START_DATE);
    currentDate.setDate(currentDate.getDate() + dayIndex);
    const dateString = formatDate(currentDate);

    // --- Daily Schedule Generation ---
    if (dayIndex === 0) {
      // Monday: Arrival & Setup
      createEverywhereEventsForDay(
        'Zeltbau',
        dateString,
        '10:00 - 12:00',
        'Willkommen im Camp! Findet euren zugewiesenen Platz und baut eure Zelte auf.',
      );
      createEverywhereEventsForDay(
        'Mittagessen',
        dateString,
        '12:30 - 13:30',
        'Stärkung nach dem Aufbau.',
      );
      // Schedule the first introductory workshop
      scheduleConcurrentWorkshops(dateString, '14:30 - 16:00', 1);
      createEverywhereEventsForDay(
        'Nachtessen',
        dateString,
        '18:30 - 19:30',
        'Das erste gemeinsame Abendessen.',
      );
      allEvents.push(
        createEvent(
          'Plenum vor Bühne',
          dateString,
          '20:00 - 21:00',
          mainStageLocation,
          faker.helpers.arrayElement(userIds),
          'Offizielle Eröffnung des Lagers.',
        ),
      );
    } else if (dayIndex < CAMP_DAYS - 1) {
      // Tuesday - Friday: Main Program
      // Standard morning routine
      createEverywhereEventsForDay(
        'Morgensport',
        dateString,
        '07:00 - 07:45',
        'Startet fit in den Tag!',
      );
      createEverywhereEventsForDay(
        'Morgenessen',
        dateString,
        '08:00 - 09:00',
        'Geniesst das Frühstück.',
      );

      // Daily Program Block
      switch (dayIndex) {
        case 1: {
          // Tuesday: Workshop Day 1
          scheduleConcurrentWorkshops(dateString, '10:00 - 12:00', 4); // 4 workshops in the morning
          scheduleConcurrentWorkshops(dateString, '14:00 - 16:00', 3); // 3 workshops in the afternoon

          break;
        }
        case 2: {
          // Wednesday: Hike Day
          createEverywhereEventsForDay(
            'Tageswanderung',
            dateString,
            '09:30 - 16:00',
            'Heute erkunden wir die Umgebung! Das Mittagessen gibt es als Lunchpaket.',
          );

          break;
        }
        case 3: {
          // Thursday: Big Game Day & Workshops
          scheduleConcurrentWorkshops(dateString, '10:00 - 12:00', 4); // 4 more workshops
          createEverywhereEventsForDay(
            'Geländespiel',
            dateString,
            '14:00 - 17:00',
            'Das grosse Geländespiel steht an! Taktik, Teamwork und Spass sind gefragt.',
          );

          break;
        }
        case 4: {
          // Friday: Workshop Day 2 & Closing
          scheduleConcurrentWorkshops(dateString, '10:00 - 12:00', 5); // 5 workshops in the morning
          scheduleConcurrentWorkshops(dateString, '14:00 - 16:00', 4); // Final 4 workshops
          allEvents.push(
            createEvent(
              'Plenum vor Bühne',
              dateString,
              '20:00 - 21:30',
              mainStageLocation,
              faker.helpers.arrayElement(userIds),
              'Abschlussabend mit Rückblick und Lagerfeuer.',
            ),
          );

          break;
        }
        // No default
      }

      // Standard lunch and dinner (except on hike day)
      if (dayIndex !== 2) {
        createEverywhereEventsForDay(
          'Mittagessen',
          dateString,
          '12:30 - 13:30',
          'Zeit für die Mittagspause.',
        );
      }
      createEverywhereEventsForDay(
        'Nachtessen',
        dateString,
        '18:30 - 19:30',
        'Gemeinsames Abendessen.',
      );
    } else {
      // Saturday: Departure
      createEverywhereEventsForDay(
        'Morgenessen',
        dateString,
        '08:00 - 09:00',
        'Das letzte Frühstück im Camp.',
      );
      createEverywhereEventsForDay(
        'Abbau',
        dateString,
        '09:30 - 11:30',
        'Alle packen mit an! Zelte abbauen und den Lagerplatz sauber hinterlassen.',
      );
      createEverywhereEventsForDay(
        'Transfer',
        dateString,
        '11:30 - 13:00',
        'Verabschiedung und organisierter Transfer. Auf Wiedersehen!',
      );
    }
  }

  return allEvents;
};
