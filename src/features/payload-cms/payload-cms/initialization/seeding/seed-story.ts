import { createRichText } from '@/features/payload-cms/payload-cms/initialization/seeding/schedule-entries';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Payload } from 'payload';

/** The camp days of the seeded programme, see `schedule-entries.ts`. */
const CAMP_DAYS = ['2027-07-26', '2027-07-27', '2027-07-28', '2027-07-29', '2027-07-30'];

const HOUR = 60 * 60 * 1000;

/**
 * A new object for every call: Payload keeps a request's flags in it, such as the storage
 * plugin's, and one shared object let them leak into the next upload, whose files then never
 * reached the bucket.
 */
const context = (): { disableRevalidation: boolean } => ({ disableRevalidation: true });

/** A portrait to upload: a coloured square with the figure's initial. */
const portrait = async (initial: string, color: string): Promise<Buffer> => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720">
    <rect width="720" height="720" fill="${color}" />
    <circle cx="360" cy="290" r="130" fill="#ffffff" fill-opacity="0.25" />
    <rect x="170" y="440" width="380" height="280" rx="190" fill="#ffffff" fill-opacity="0.25" />
    <text x="50%" y="300" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="150" fill="#ffffff">${initial}</text>
  </svg>`;
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const { default: sharp } = await import('sharp');
  return await sharp(Buffer.from(svg)).toFormat('png').toBuffer();
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
};

/**
 * A short story of a Rollenspiel for the camp week, with figures, events and challenges, seeded
 * relative to the moment of seeding: some of it has appeared, one event and one figure appear ten
 * minutes later, and the rest only in days, so a local stack shows the story growing.
 *
 * @param payload The Payload instance
 * @param mainStageId The place the Rollenspiel blocks happen at
 * @param quartierId A Quartier, whose head is one of the figures
 */
export const seedStory = async (
  payload: Payload,
  mainStageId: string,
  quartierId: string | undefined,
): Promise<void> => {
  const now = Date.now();
  const inHours = (hours: number): string => new Date(now + hours * HOUR).toISOString();

  const { id: categoryId } = await payload.create({
    collection: 'camp-categories',
    locale: LOCALE.DE,
    data: { title: 'Rollenspiel', colorTheme: 'rose', isStory: true },
    context: context(),
  });

  const blockIds: string[] = [];
  for (const day of CAMP_DAYS) {
    const { id } = await payload.create({
      collection: 'camp-schedule-entry',
      data: {
        title: 'Rollenspiel',
        kind: 'program',
        timeslot: { date: day, time: '21:00 - 21:30' },
        location: mainStageId,
        description: createRichText('Der Hofstaat des Königs tritt auf.'),
        category: categoryId,
      },
      context: context(),
    });
    blockIds.push(id);
  }

  const { id: infopointId } = await payload.create({
    collection: 'camp-map-annotations',
    data: {
      title: 'Infopoint',
      annotationType: 'marker',
      icon: 'HelpCircle',
      importance: 'high',
      color: '1e88e5',
      geometry: [8.2979, 46.500_45],
      showLabel: true,
      description: createRichText('Hier werden die Challenges bestätigt.'),
    },
    context: context(),
  });

  const upload = async (name: string, initial: string, color: string): Promise<string> => {
    const data = await portrait(initial, color);
    const { id } = await payload.create({
      collection: 'story-images',
      locale: LOCALE.DE,
      data: { alt: name },
      file: { data, mimetype: 'image/png', name: `${initial}.png`, size: data.length },
      context: context(),
    });
    return id;
  };

  const figure = async (data: {
    name: string;
    role: string;
    belongsTo: 'court' | 'quartier' | 'other';
    visibleFrom: string;
    photo?: string;
    quartier?: string;
  }): Promise<string> => {
    const { id } = await payload.create({
      collection: 'story-figures',
      locale: LOCALE.DE,
      data,
      context: context(),
    });
    return id;
  };

  const king = await figure({
    name: 'König Aurel',
    role: 'Herrscher über das Königreich',
    belongsTo: 'court',
    visibleFrom: inHours(-120),
    photo: await upload('König Aurel', 'K', '#6d28d9'),
  });
  const champion = await figure({
    name: 'Der Champion',
    role: 'Königlicher Champion, Hüter der Turniere',
    belongsTo: 'court',
    visibleFrom: inHours(-120),
    photo: await upload('Der Champion', 'C', '#b45309'),
  });
  const ilva = await figure({
    name: 'Hofmeisterin Ilva',
    role: 'Verwaltet den Hof und seine Schätze',
    belongsTo: 'court',
    visibleFrom: inHours(-120),
  });
  const sora = await figure({
    name: 'Sora',
    role: 'Oberhaupt des Quartiers',
    belongsTo: 'quartier',
    visibleFrom: inHours(-48),
    ...(quartierId === undefined ? {} : { quartier: quartierId }),
    photo: await upload('Sora', 'S', '#be185d'),
  });
  // appears with the betrayal, ten minutes after seeding: until then nothing may mention it
  const shadow = await figure({
    name: 'Die Schattenhand',
    role: 'Niemand kennt ihr Gesicht',
    belongsTo: 'other',
    visibleFrom: inHours(1 / 6),
    photo: await upload('Die Schattenhand', 'S', '#334155'),
  });

  const event = async (data: {
    title: string;
    text: string;
    visibleFrom: string;
    isPrologue?: boolean;
    day?: string;
    scheduleEntries?: string[];
    figures?: string[];
    locations?: string[];
  }): Promise<string> => {
    const { id } = await payload.create({
      collection: 'story-events',
      locale: LOCALE.DE,
      data,
      context: context(),
    });
    return id;
  };

  await event({
    title: 'Wie das Königreich entstand',
    isPrologue: true,
    visibleFrom: inHours(-120),
    text: 'Vor langer Zeit einigten sich acht Quartiere auf einen gemeinsamen König. Als Zeichen des Friedens liess er ein Siegel schmieden, das jedes Quartier anerkennt.\n\nSeither wacht der königliche Champion über das Siegel und über die Turniere, in denen die Quartiere ihre Streitigkeiten austragen.',
    figures: [king, champion],
  });
  await event({
    title: 'Ankunft am Hof',
    day: `${CAMP_DAYS[0] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(-48),
    text: 'Der König lädt alle Quartiere an seinen Hof ein und stellt seinen Hofstaat vor. Die Hofmeisterin Ilva zeigt den Höfen das Siegel im Thronsaal.',
    scheduleEntries: blockIds.slice(0, 1),
    figures: [king, champion, ilva],
    locations: [mainStageId],
  });
  const sealEvent = await event({
    title: 'Das verschwundene Siegel',
    day: `${CAMP_DAYS[1] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(-2),
    text: 'Nach dem Tagesschluss bemerkt die Hofmeisterin, dass das Siegel des Königs aus dem Thronsaal verschwunden ist.\n\nDer Champion verdächtigt sofort die Quartieroberhäupter und fordert jeden Hof zu einer Kraftprobe heraus. Sora weist den Verdacht zurück.',
    scheduleEntries: blockIds.slice(1, 2),
    figures: [champion, sora, ilva],
    locations: [mainStageId],
  });
  const betrayalEvent = await event({
    title: 'Der Verrat im Thronsaal',
    day: `${CAMP_DAYS[2] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(1 / 6),
    text: 'Die Schattenhand tritt zum ersten Mal auf: Sie hat das Siegel und verlangt vom König, dass er abdankt. Der Champion zweifelt zum ersten Mal an seinem König.',
    scheduleEntries: blockIds.slice(2, 3),
    figures: [king, champion, shadow],
  });
  await event({
    title: 'Die Spur führt nach Kitsune',
    day: `${CAMP_DAYS[3] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(48),
    text: 'Eine Feder der Schattenhand wird im Quartier Kitsune gefunden.',
    scheduleEntries: blockIds.slice(3, 4),
    figures: [sora, shadow],
  });

  await payload.update({
    collection: 'story-figures',
    id: champion,
    locale: LOCALE.DE,
    data: {
      knowledge: [
        { text: 'Stolz, ehrgeizig und dem König treu ergeben. Hat noch nie ein Turnier verloren.' },
        {
          event: sealEvent,
          text: 'Verdächtigt die Quartieroberhäupter, das Siegel gestohlen zu haben, und fordert jeden Hof zu einer Kraftprobe heraus.',
        },
        {
          event: betrayalEvent,
          text: 'Zweifelt nach dem Auftritt der Schattenhand zum ersten Mal am König.',
        },
        {
          visibleFrom: inHours(72),
          text: 'Ist der jüngere Bruder der Schattenhand.',
        },
      ],
      relations: [
        { figure: king, description: 'Dient ihm treu' },
        { figure: sora, description: 'Misstraut ihr seit dem Diebstahl', visibleFrom: inHours(-2) },
        { figure: shadow, description: 'Sein Bruder', visibleFrom: inHours(72) },
      ],
    },
    context: context(),
  });
  await payload.update({
    collection: 'story-figures',
    id: sora,
    locale: LOCALE.DE,
    data: {
      knowledge: [
        { text: 'Führt ihr Quartier mit List und Ruhe. Spricht nie ein Wort zu viel.' },
        {
          event: sealEvent,
          text: 'Weist jeden Verdacht zurück und verlangt Beweise vom Champion.',
        },
      ],
      relations: [{ figure: champion, description: 'Hält ihn für vorschnell' }],
    },
    context: context(),
  });
  await payload.update({
    collection: 'story-figures',
    id: king,
    locale: LOCALE.DE,
    data: {
      knowledge: [
        { text: 'Gütig, aber müde. Regiert seit dreissig Jahren.' },
        { event: betrayalEvent, text: 'Wird von der Schattenhand zur Abdankung aufgefordert.' },
      ],
    },
    context: context(),
  });

  const challenge = async (data: {
    title: string;
    from: string;
    day: string;
    visibleFrom: string;
    until?: string;
    message: string;
    task: string;
  }): Promise<void> => {
    await payload.create({
      collection: 'story-challenges',
      locale: LOCALE.DE,
      data: { ...data, confirmAt: infopointId },
      context: context(),
    });
  };

  await challenge({
    title: 'Seilziehen um die Fahne',
    from: champion,
    day: `${CAMP_DAYS[0] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(-50),
    until: inHours(-40),
    message: '«Willkommen am Hof! Zeigt mir, dass ihr zusammen ziehen könnt.»',
    task: 'Fordert einen anderen Hof zum Seilziehen heraus. Der Sieger meldet sich am Infopoint.',
  });
  await challenge({
    title: 'Baut die höchste Menschenpyramide',
    from: champion,
    day: `${CAMP_DAYS[1] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(-3),
    until: inHours(6),
    message: '«Man sagt, eure Höfe seien stark. Beweist es mir – vor Sonnenuntergang!»',
    task: 'Mindestens zehn Personen, drei Etagen.\n\nZeigt sie der Person am Infopoint oder bringt ein Foto mit.',
  });
  await challenge({
    title: 'Folgt den Spuren des Siegels',
    from: ilva,
    day: `${CAMP_DAYS[1] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(-3),
    until: inHours(6),
    message: '«Wer das Siegel genommen hat, hat Spuren hinterlassen. Findet sie.»',
    task: 'Ein kleiner Foxtrail mit drei Posten auf dem Platz. Den Code vom letzten Posten bringt ihr zum Infopoint.',
  });
  await challenge({
    title: 'Das Rätsel der Schattenhand',
    from: shadow,
    day: `${CAMP_DAYS[2] ?? ''}T10:00:00.000Z`,
    visibleFrom: inHours(1 / 6),
    until: inHours(30),
    message: '«Wer mein Rätsel löst, erfährt, wo das Siegel liegt.»',
    task: 'Das Rätsel hängt am Infopoint.',
  });

  console.log('Seeding: Story created.');
};
