import { faker } from '@faker-js/faker';
import { RequiredDataFromCollectionSlug } from 'payload';

// these entries are polaced at all campsites
const scheduleEntriesEverywhere: [string, [string, string][]][] = [
  ['Aufbau', [['2027-07-25', '12:00 - 18:00']]],
  [
    'Morgenessen',
    [
      ['2027-07-25', '08:00 - 09:00'],
      ['2027-07-26', '08:00 - 09:00'],
      ['2027-07-27', '08:00 - 09:00'],
      ['2027-07-28', '08:00 - 09:00'],
      ['2027-07-29', '08:00 - 09:00'],
      ['2027-07-30', '08:00 - 09:00'],
      ['2027-07-31', '08:30 - 10:00'],
      ['2027-08-01', '08:00 - 09:00'],
      ['2027-08-02', '07:00 - 08:00'],
    ],
  ],
  ['Hike', [['2027-07-31', '08:00-23:59']]],
  ['Abbau', [['2027-08-02', '12:00 - 18:00']]],
];

// these entries are only at a single location (campsite)
const scheduleEntriesProgram: [string, [string, string][]][] = [
  ['Rollenspiel 1', [['2027-07-25', '08:00 - 09:00']]],
  ['Rollenspiel 2', [['2027-07-26', '08:00 - 09:00']]],
  ['Rollenspiel 3', [['2027-07-27', '08:00 - 09:00']]],
  ['Rollenspiel 4', [['2027-07-28', '08:00 - 09:00']]],
  ['Rollenspiel 5', [['2027-07-29', '08:00 - 09:00']]],
];

const generateEverywhereEvents = (
  campSitesId: string[],
): RequiredDataFromCollectionSlug<'camp-schedule-entry'>[] => {
  return campSitesId.flatMap((campSiteId) => {
    return scheduleEntriesEverywhere.map((entry) => {
      return {
        title: entry[0],
        timeslots: entry[1].map((timeslot) => {
          return {
            date: timeslot[0],
            time: timeslot[1],
          };
        }),
        location: campSiteId,
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
                    text: faker.lorem.paragraph(),
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
    });
  });
};

const generateProgramEvents = (campSitesId: string[]) => {
  return scheduleEntriesProgram.map((entry) => {
    return {
      title: entry[0],
      timeslots: entry[1].map((timeslot) => {
        return {
          date: timeslot[0],
          time: timeslot[1],
        };
      }),
      location: faker.helpers.arrayElement(campSitesId),
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
                  text: faker.lorem.paragraph(),
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
  });
};

export const generateScheduleEntries = (
  campSitesId: string[],
): RequiredDataFromCollectionSlug<'camp-schedule-entry'>[] => {
  return [...generateEverywhereEvents(campSitesId), ...generateProgramEvents(campSitesId)];
};
