import type { RessortCategory } from '@/features/payload-cms/constants/ressort-options';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Payload } from 'payload';

interface JobSeedingData {
  departmentCode: 'KOMA' | 'PROST' | 'FUSI';
  title: string;
  description: string;
  quota: string;
  age: string;
  setup: boolean;
  main: boolean;
  teardown: boolean;
}

const rawJobs: JobSeedingData[] = [
  {
    departmentCode: 'KOMA',
    title: 'Social Media Gruppe Behind the Scenes',
    description:
      'Du erstellst Social Media Inhalte mit dem Fokus auf "Behind the Scenes". Entweder als Moderator, Filmer, Regisseur oder Cutter',
    quota: '4',
    age: '16',
    setup: true,
    main: true,
    teardown: true,
  },
  {
    departmentCode: 'KOMA',
    title: 'Social Media Gruppe Tagesrückblick Social Media',
    description:
      'Du erstellst Social Media Inhalte mit dem Fokus auf "Tagesrückblick". Entweder als Moderator, Filmer, Regisseur oder Cutter',
    quota: '4',
    age: '16',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Social Media Gruppe Funny Stuff',
    description:
      'Du erstellst Social Media Inhalte mit dem Fokus auf "Funny Stuff". Entweder als Moderator, Filmer, Regisseur oder Cutter',
    quota: '4',
    age: '16',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Video Gruppe Tagesrückblick für Bühne',
    description:
      'Du erstellst Social Media Inhalte mit dem Fokus auf "Tagesrückblick Querformat für Bühne". Entweder als Moderator, Filmer, Regisseur oder Cutter. Ab hälfte Aufbau',
    quota: '3',
    age: '16',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Social Media Gruppe Französisch',
    description:
      'Du erstellst Social Media Inhalte mit dem Fokus auf "Französischem Inhalt". Entweder als Moderator, Filmer, Regisseur oder Cutter',
    quota: '3',
    age: '16',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Cutter for diverse Videos',
    description:
      'du schneidest alle möglichen Videos für Plenum oder Social Media. Schnitterfahrung und eigener Laptop nötig',
    quota: '2',
    age: '16',
    setup: false,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Lagerfilm Zuständige',
    description: 'Du erstellst den Lagermovie der 1 Monat nach dem Lager veröffentlicht wird',
    quota: '3',
    age: '18',
    setup: true,
    main: true,
    teardown: true,
  },
  {
    departmentCode: 'KOMA',
    title: 'Check-In Stand',
    description: 'Bei Eingang Check-In für alle Ankommenden und abreissenden',
    quota: '2',
    age: '18',
    setup: false,
    main: false,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Info-Stand / Fundbüro',
    description: 'Du bist Dreh und Angelpunkt für alle die Hilfe brauchen und führst das Fundbüro',
    quota: '6',
    age: '18',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Fotografen Aufbaulager',
    description: 'Hierfür brauchst du eine eigene Kamera',
    quota: '2',
    age: '16',
    setup: true,
    main: false,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Fotografen Hauptlager',
    description: 'Hierfür brauchst du eine eigene Kamera',
    quota: '4',
    age: '16',
    setup: false,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Fotografen Abbaulager',
    description: 'Hierfür brauchst du eine eigene Kamera',
    quota: '2',
    age: '16',
    setup: false,
    main: false,
    teardown: true,
  },
  {
    departmentCode: 'KOMA',
    title: 'Merch Verkäufer',
    description: 'darf jeweils halbtag im Shop Artikel verkaufen',
    quota: '6',
    age: '16',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'KOMA',
    title: 'Verantwortliche Pressemitteilungen deutsch',
    description: 'Presseverantwortliche Personen wärend dem Lager',
    quota: '2',
    age: '18',
    setup: true,
    main: true,
    teardown: true,
  },
  {
    departmentCode: 'KOMA',
    title: 'Texter Webseiten/Appinhalt',
    description:
      'Mit deiner Arbeit wird die Webseite und App mit Informationen befüllt. Gute Deutschkenntnisse notwendig.',
    quota: '3',
    age: '18',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'PROST',
    title: 'Bühnenverantwortung',
    description:
      'Koordination mit anderen Bühnenprogrammen + sicherstellen, dass Requisiten und Technik für jeden Tag richtig eingerichtet ist.',
    quota: '1',
    age: '',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'PROST',
    title: 'Regie Assistenz',
    description:
      'Schaut, dass Proben stattfinden kann, organisiert fehlende Leute falls jmd. Krank, falls jmd. Zu spät etc. Statisten briefen.',
    quota: '2',
    age: '',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'PROST',
    title: 'Kostüm/Material-Verantworung',
    description:
      'Verantwortlich, dass bei allen RS alles ready ist--> organisiert dass nichts verloren geht, dass ordnung bleibt, evtl. Flicken von Requisiten organisiert,... ',
    quota: '1',
    age: '',
    setup: true,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'PROST',
    title: 'Verantwortliche Untertitel',
    description:
      'Während RS die mehrsprachigen Untertitel im tichtigen Tempo auf die Leinwände schalten.',
    quota: '2',
    age: '',
    setup: false,
    main: true,
    teardown: false,
  },
  {
    departmentCode: 'FUSI',
    title: 'Guide Lagerführungen',
    description:
      'Du führst externe Gäste einzeln oder in Gruppen über den Lagerplatz und gibst ihnen Infos über Lagerplatz und Projekt. Idealerweise füssig in EN, FR und DE',
    quota: '3',
    age: '',
    setup: false,
    main: true,
    teardown: false,
  },
];

// Correct manual override for Check-In Stand to Main
const checkInJob = rawJobs.find((index) => index.title === 'Check-In Stand');
if (checkInJob) {
  checkInJob.main = true;
}

const categoryMapping: Record<string, RessortCategory> = {
  KOMA: 'marketing',
  PROST: 'programm',
  FUSI: 'relations',
};

// Dates (Placeholder - adjust as needed)
const DATES = {
  setup: {
    start: '2027-07-15T00:00:00.000Z',
    end: '2027-07-23T00:00:00.000Z',
  },
  main: {
    start: '2027-07-24T00:00:00.000Z',
    end: '2027-07-31T00:00:00.000Z',
  },
  teardown: {
    start: '2027-08-01T00:00:00.000Z',
    end: '2027-08-05T00:00:00.000Z',
  },
};

export const seedJobs = async (payload: Payload): Promise<void> => {
  console.log('Seeding: Creating helper jobs...');

  const existingJobs = await payload.count({ collection: 'helper-jobs' });
  if (existingJobs.totalDocs > 0) {
    console.log('Seeding: Helper jobs already exist. Skipping.');
    return;
  }

  for (const job of rawJobs) {
    const category = categoryMapping[job.departmentCode];
    if (category === undefined) {
      console.warn(`Unknown department code: ${job.departmentCode}`);
      continue;
    }

    const phases: Array<'setup' | 'main' | 'teardown'> = [];
    if (job.setup) phases.push('setup');
    if (job.main) phases.push('main');
    if (job.teardown) phases.push('teardown');

    for (const phase of phases) {
      // Determine max quota
      let maxQuota = Number.parseInt(job.quota);
      if (Number.isNaN(maxQuota)) maxQuota = 100; // Fallback

      const { id } = await payload.create({
        collection: 'helper-jobs',
        locale: LOCALE.DE,
        data: {
          title: job.title,
          description: job.description,
          category,
          maxQuota,
          dateRangeCategory: phase,
          dateRange: {
            startDate: DATES[phase].start,
            endDate: DATES[phase].end,
          },
        },
      });

      // Update for EN and FR with same content (as translations are not provided)
      await payload.update({
        collection: 'helper-jobs',
        id,
        locale: LOCALE.EN,
        data: {
          title: job.title,
          description: job.description,
        },
      });

      await payload.update({
        collection: 'helper-jobs',
        id,
        locale: LOCALE.FR,
        data: {
          title: job.title,
          description: job.description,
        },
      });
    }
  }

  console.log('Seeding: Helper jobs created.');
};
