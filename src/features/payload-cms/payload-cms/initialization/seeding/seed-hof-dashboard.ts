import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Form, GenericPage, Hof, Permission } from '@/features/payload-cms/payload-types';
import type { Payload, RequiredDataFromCollectionSlug } from 'payload';

/** The camp's milestones from the Ressorts' concept for the dashboard. */
const DEADLINES = [
  {
    date: '2027-01-31T12:00:00.000Z',
    title: '1. Abgabe Grobkonzept Abteilungsbauten',
    area: 'infrastructure' as const,
  },
  { date: '2027-01-31T12:00:00.000Z', title: 'Abgabe Hofprogramme', area: 'program' as const },
  {
    date: '2027-01-31T12:00:00.000Z',
    title: 'Materialbestellung Hof-Infrastruktur und Stadtleben',
    area: 'material' as const,
  },
  {
    date: '2027-03-31T12:00:00.000Z',
    title: '2. Abgabe Grobkonzept Abteilungsbauten (falls vom Ressort Infrastruktur verlangt)',
    area: 'infrastructure' as const,
  },
  {
    date: '2027-05-31T12:00:00.000Z',
    title: 'Abgabe Feinkonzept Abteilungsbauten',
    area: 'infrastructure' as const,
  },
];

const SAFETY_RISK_CRITERIA = [
  'Alle Aktivitäten ausserhalb des Lagergeländes (ausgenommen offizielle Programmteile)',
  'Bauten und Türme mit Absturzmöglichkeiten von mehr als 3 Metern Plattformhöhe',
  'Bauten, Türme und Grosszelte mit einer Mastenlänge von über 6 Metern',
  'Umzäunungen, Einfriedungen, Sichtschutz (aus Blachen, Holz, Heuballen usw.)',
  'Events und Programmblöcke mit mehr als 500 Personen',
  'Einsätze und Aktionen mit Feuer, Pyro, Rauch, Wasser, Gas, Chemikalien usw.',
  'Sicherheitsrelevante oder verletzungsgefährliche Programmpunkte',
  'Alle Verkaufsstände, Restaurants, Bars oder externe Zelte auf dem Lagergelände',
  'Aktionen ausserhalb des üblichen Zeitrahmens (nach 23:00 oder vor 07:00 Uhr)',
];

const INFRASTRUCTURE_MATERIAL = [
  { name: 'Bindestrick' },
  { name: 'Manipulierseil (10–15 m)' },
  { name: 'Zelttuch inkl. Zeltschnur' },
  { name: 'Ausschusszelttuch' },
  { name: 'Zelttasche zu Zelttuch' },
  { name: 'Handbeil' },
  { name: 'Spaten' },
  { name: 'Pickel' },
  { name: 'Baumstamm 6 m (Durchmesser 10 cm)', section: 'Holz' },
  { name: 'Baumstamm 6 m (Durchmesser 20 cm)', section: 'Holz' },
  { name: 'Baumstamm 10 m (Durchmesser 15 cm)', section: 'Holz' },
  { name: 'Baumstamm 12 m (Durchmesser 20 cm)', section: 'Holz' },
  { name: 'Schwartenbretter 5 m lang', section: 'Holz' },
  { name: 'Dachlatten (27×50 mm, 4 m)', section: 'Holz' },
  { name: 'Doppellatten (40×60 mm, 4 m)', section: 'Holz' },
  { name: 'Schalungstafel', section: 'Holz' },
];

const STADTLEBEN_MATERIAL = [
  { name: 'Manipulierseil (10–15 m)' },
  { name: 'Zelttuch inkl. Zeltschnur' },
  { name: 'Ausschusszelttuch' },
  { name: 'Zelttasche zu Zelttuch' },
  { name: 'Festtisch', section: 'Mobiliar' },
  { name: 'Festbank', section: 'Mobiliar' },
];

/** A one-page PDF standing in for real plans and the Merkblatt. */
const PLACEHOLDER_PDF = Buffer.from(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj
trailer << /Root 1 0 R >>
%%EOF
`);

type RichText = NonNullable<Form['confirmationMessage']>;

interface LexicalNode {
  type: string;
  version: number;
  [key: string]: unknown;
}

const textNode = (text: string): LexicalNode => ({
  type: 'text',
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  version: 1,
});

const root = (children: LexicalNode[]): RichText => ({
  root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
});

const paragraph = (text: string): RichText =>
  root([
    {
      type: 'paragraph',
      children: [textNode(text)],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  ]);

const numberedList = (items: string[]): RichText =>
  root([
    {
      type: 'list',
      listType: 'number',
      tag: 'ol',
      start: 1,
      children: items.map((item, index) => ({
        type: 'listitem',
        value: index + 1,
        children: [textNode(item)],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  ]);

const PLAN_FILE_TYPES = '.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.zip';

const hofField = { blockType: 'hofSelection', name: 'hof', label: 'Hof', required: true };

/** A plan with its safety question, as every plan of the Ressorts' concept asks it. */
const planFields = (planLabel: string): Record<string, unknown>[] => [
  hofField,
  {
    blockType: 'fileUpload',
    name: 'planung',
    label: planLabel,
    required: true,
    allowMultiple: true,
    allowedFileTypes: 'custom',
    customAllowedFileTypes: PLAN_FILE_TYPES,
  },
  {
    blockType: 'select',
    name: 'sicherheitsrisiko',
    label: 'Erhöhtes Sicherheitsrisiko?',
    required: true,
    optionType: 'cards',
    options: [
      { value: 'ja', label: 'Ja' },
      { value: 'nein', label: 'Nein' },
    ],
  },
  {
    blockType: 'message',
    collapsibleTitle: 'Was zählt als erhöhtes Sicherheitsrisiko?',
    message: numberedList(SAFETY_RISK_CRITERIA),
  },
  {
    blockType: 'conditionedBlock',
    displayCondition: { field: 'sicherheitsrisiko', value: 'ja' },
    fields: [
      {
        blockType: 'fileUpload',
        name: 'sicherheitskonzept',
        label: 'Sicherheitskonzept',
        required: true,
        allowedFileTypes: 'custom',
        customAllowedFileTypes: PLAN_FILE_TYPES,
      },
    ],
  },
  { blockType: 'textarea', name: 'bemerkungen', label: 'Bemerkungen an das Ressort' },
];

interface DashboardFormSeed {
  key: string;
  title: string;
  submitButtonLabel: string;
  fields: Record<string, unknown>[];
  hofDashboard: NonNullable<Form['hofDashboard']>;
}

const FORMS: DashboardFormSeed[] = [
  ...(
    [
      ['flaggenmast', 'Flaggenmast oder zentrales Symbol'],
      ['eingang', 'Eingangs- oder Begrenzungselemente'],
      ['hofbauten', 'Hofbauten'],
      ['schlafzelt', 'Schlafzelt'],
    ] as const
  ).map(([key, title], index): DashboardFormSeed => ({
    key,
    title,
    submitButtonLabel: 'Planung abgeben',
    fields: planFields('Planung'),
    hofDashboard: {
      area: 'infrastructure',
      entries: 'versions',
      title,
      description:
        'Grobkonzept als Plan oder Skizze. Bei erhöhtem Sicherheitsrisiko gehört ein Sicherheitskonzept dazu.',
      deadline: '2027-01-31T12:00:00.000Z',
      onlyHofAdministrators: true,
      position: index + 1,
    },
  })),
  {
    key: 'hofprogramm',
    title: 'Dossier Hofprogramme inkl. Anhänge',
    submitButtonLabel: 'Dossier abgeben',
    fields: planFields('Dossier mit Anhängen'),
    hofDashboard: {
      area: 'program',
      entries: 'versions',
      title: 'Dossier Hofprogramme inkl. Anhänge',
      deadline: '2027-01-31T12:00:00.000Z',
      onlyHofAdministrators: true,
      position: 1,
    },
  },
  {
    key: 'stadtleben',
    title: 'Standanmeldung fürs Stadtleben',
    submitButtonLabel: 'Standanmeldung abschliessen',
    fields: [
      { blockType: 'text', name: 'name', label: 'Name des Standes', required: true },
      hofField,
      { blockType: 'textarea', name: 'beschreibung', label: 'Was bietet ihr an?' },
    ],
    hofDashboard: {
      area: 'program',
      entries: 'entries',
      title: 'Stadtleben',
      description:
        'Jeder Stand wird einzeln angemeldet. Freigegebene Stände erscheinen auf der Website.',
      deadline: '2027-01-31T12:00:00.000Z',
      titleField: 'name',
      onlyHofAdministrators: false,
      position: 2,
    },
  },
  {
    key: 'material-infrastruktur',
    title: 'Materialbestellung Hof-Infrastruktur',
    submitButtonLabel: 'Bestellung abgeben',
    fields: [
      hofField,
      {
        blockType: 'materialList',
        name: 'material',
        label: 'Material',
        required: true,
        items: INFRASTRUCTURE_MATERIAL,
      },
      { blockType: 'textarea', name: 'bemerkungen', label: 'Bemerkungen' },
    ],
    hofDashboard: {
      area: 'material',
      entries: 'versions',
      title: 'Materialbestellung Hof-Infrastruktur',
      description:
        'Die neueste Bestellung gilt. Nach der Frist nimmt das Ressort Änderungen entgegen.',
      deadline: '2027-01-31T12:00:00.000Z',
      closesAtDeadline: true,
      onlyHofAdministrators: true,
      position: 1,
    },
  },
  {
    key: 'material-stadtleben',
    title: 'Materialbestellung Stadtleben',
    submitButtonLabel: 'Bestellung abgeben',
    fields: [
      hofField,
      {
        blockType: 'materialList',
        name: 'material',
        label: 'Material',
        required: true,
        items: STADTLEBEN_MATERIAL,
      },
      { blockType: 'checkbox', name: 'strom', label: paragraph('Stromanschluss benötigt') },
    ],
    hofDashboard: {
      area: 'material',
      entries: 'versions',
      title: 'Materialbestellung Stadtleben',
      deadline: '2027-01-31T12:00:00.000Z',
      closesAtDeadline: true,
      onlyHofAdministrators: true,
      position: 2,
    },
  },
];

const formData = (seed: DashboardFormSeed): RequiredDataFromCollectionSlug<'forms'> =>
  ({
    title: seed.title,
    fileUploadLimitMB: 25,
    confirmationType: 'message',
    confirmationMessage: paragraph('Danke, das ist angekommen.'),
    sections: [
      { formSection: { sectionTitle: seed.title, layout: 'standard', fields: seed.fields } },
    ],
    submitButtonLabel: seed.submitButtonLabel,
    hofDashboard: seed.hofDashboard,
    _localized_status: { published: true },
    _locale: 'de',
    _status: 'published',
  }) as unknown as RequiredDataFromCollectionSlug<'forms'>;

const page = (
  permission: Permission,
  {
    title,
    slug,
    block,
  }: { title: string; slug: string; block: GenericPage['content']['mainContent'][number] },
): RequiredDataFromCollectionSlug<'generic-page'> => ({
  internalPageName: slug,
  authors: [],
  internalStatus: 'approved',
  _status: 'published',
  content: {
    permissions: permission,
    pageTitle: title,
    releaseDate: '2025-01-01T01:00:00.000Z',
    mainContent: [block],
  },
  seo: { urlSlug: slug, metaTitle: title, metaDescription: 'conveniat27', keywords: 'Hof' },
  _localized_status: { published: true },
  _locale: LOCALE.DE,
});

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

/** A submission as a Hof hands it in, with its Ressort answer, written past the hooks. */
interface SubmissionSeed {
  form: string;
  hof: Pick<Hof, 'id' | 'name'>;
  answers: Record<string, string>;
  /** File names of each upload field, stored as permanent files of the submission. */
  files?: Record<string, string[]>;
  review?: { status: 'inReview' | 'revisionRequired' | 'accepted'; feedback?: string };
  approved?: boolean;
  daysAgo: number;
}

/**
 * Writes a submission and its files the way a Hof's would end up: the hooks are skipped, since
 * they check the session of whoever hands it in, which the seed has none of.
 */
const createSubmission = async (payload: Payload, seed: SubmissionSeed): Promise<void> => {
  const createdAt = daysAgo(seed.daysAgo);
  const fileIds: Record<string, string[]> = {};
  for (const [field, names] of Object.entries(seed.files ?? {})) {
    fileIds[field] = [];
    for (const name of names) {
      const file = await payload.create({
        collection: 'form_collection',
        data: { isTemporary: false, form: seed.form, originalFilename: name },
        file: {
          data: PLACEHOLDER_PDF,
          mimetype: 'application/pdf',
          name: `${seed.hof.name}-${name}`.replaceAll(/[^\w.-]/g, '_'),
          size: PLACEHOLDER_PDF.byteLength,
        },
        overrideAccess: true,
      });
      fileIds[field].push(file.id);
    }
  }
  const answers = {
    hof: seed.hof.name,
    ...seed.answers,
    ...Object.fromEntries(Object.entries(fileIds).map(([field, ids]) => [field, ids.join(', ')])),
  };
  const submission = (await payload.db.create({
    collection: 'form-submissions',
    data: {
      form: seed.form,
      hof: seed.hof.id,
      approved: seed.approved ?? false,
      ...(seed.review === undefined
        ? {}
        : { hofReviewStatus: seed.review.status, hofFeedback: seed.review.feedback }),
      submissionData: Object.entries(answers).map(([field, value]) => ({ field, value })),
      createdAt,
      updatedAt: createdAt,
    },
  })) as { id: string };
  for (const ids of Object.values(fileIds)) {
    for (const id of ids) {
      await payload.update({
        collection: 'form_collection',
        id,
        data: { formSubmission: submission.id },
        overrideAccess: true,
      });
    }
  }
};

/** The answer of a material list for the given quantities, by line name. */
const materialAnswer = (
  form: { sections: Form['sections'] },
  quantities: Record<string, number>,
): string => {
  const list = form.sections
    .flatMap((section) => section.formSection.fields ?? [])
    .find((field) => field.blockType === 'materialList');
  const items = list?.blockType === 'materialList' ? list.items : [];
  return JSON.stringify(
    items.flatMap((item) => {
      const quantity = quantities[item.name];
      return quantity === undefined || typeof item.id !== 'string'
        ? []
        : [
            {
              id: item.id,
              name: item.name,
              ...(typeof item.section === 'string' ? { section: item.section } : {}),
              quantity,
            },
          ];
    }),
  );
};

/** The contact persons of a seeded Hof, their addresses on the Hof's domain. */
const contacts = (hof: string): NonNullable<Hof['dashboardContacts']> => ({
  avp: {
    name: 'Anna Beispiel v/o Fuchs',
    email: `avp@${hof}.example.com`,
    phone: '079 123 45 67',
  },
  coach: { name: 'Thomas Muster v/o Dachs', email: 'coach@example.com', phone: '076 987 65 43' },
  buildingManager: {
    name: 'Sara Keller v/o Biber',
    email: `bau@${hof}.example.com`,
    phone: '078 234 56 78',
  },
});

/**
 * The Hof dashboard of the dev seed: the forms linked to it, the milestones and a Merkblatt,
 * contacts, a page with the dashboard and one with the Stadtleben form.
 *
 * Hof West is filled in completely, with a submission in every state the Ressort can give; the
 * fake login "Hof West" (user 9) opens it. User 8 administers Hof Nord and Hof Süd, which have
 * a little each.
 */
export const seedHofDashboard = async (payload: Payload, permission: Permission): Promise<void> => {
  const { docs: hoefe } = await payload.find({
    collection: 'hoefe',
    where: { groupId: { in: ['990001', '990002', '990004'] } },
    depth: 0,
    limit: 3,
    sort: 'groupId',
  });
  const [hofNord, hofSued, hofWest] = hoefe;
  if (hofNord === undefined || hofSued === undefined || hofWest === undefined) return;

  for (const [hof, domain] of [
    [hofNord, 'hof-nord'],
    [hofWest, 'hof-west'],
  ] as const) {
    await payload.update({
      collection: 'hoefe',
      id: hof.id,
      data: { dashboardContacts: contacts(domain) },
      context: { internal: true },
    });
  }

  const forms: Record<string, Form> = {};
  for (const seed of FORMS) {
    forms[seed.key] = await payload.create({
      collection: 'forms',
      data: formData(seed),
      locale: LOCALE.DE,
      context: { disableRevalidation: true, validate: false },
    });
  }
  const formId = (key: string): string => forms[key]?.id ?? '';

  const plan = (key: string): Omit<SubmissionSeed, 'hof' | 'daysAgo'> => ({
    form: formId(key),
    answers: { sicherheitsrisiko: 'nein' },
  });
  const submissions: SubmissionSeed[] = [
    // Hof West: every state once
    {
      ...plan('flaggenmast'),
      hof: hofWest,
      files: { planung: ['Flaggenmast Plan v1.pdf'] },
      review: {
        status: 'revisionRequired',
        feedback: 'Bitte die Masthöhe einzeichnen und die Abspannung ergänzen.',
      },
      daysAgo: 20,
    },
    {
      form: formId('flaggenmast'),
      hof: hofWest,
      answers: {
        sicherheitsrisiko: 'ja',
        bemerkungen: 'Masthöhe 8 m, Abspannung an drei Punkten.',
      },
      files: {
        planung: ['Flaggenmast Plan v2.pdf', 'Flaggenmast Ansicht.pdf'],
        sicherheitskonzept: ['Sicherheitskonzept Flaggenmast.pdf'],
      },
      daysAgo: 2,
    },
    {
      ...plan('eingang'),
      hof: hofWest,
      files: { planung: ['Eingangstor.pdf'] },
      review: { status: 'accepted', feedback: 'Sieht gut aus, danke!' },
      daysAgo: 12,
    },
    {
      ...plan('hofbauten'),
      hof: hofWest,
      files: { planung: ['Hofbauten Grobkonzept.pdf'] },
      review: { status: 'inReview' },
      daysAgo: 6,
    },
    {
      ...plan('hofprogramm'),
      hof: hofWest,
      files: { planung: ['Dossier Hofprogramm.pdf'] },
      daysAgo: 1,
    },
    {
      form: formId('stadtleben'),
      hof: hofWest,
      answers: { name: 'Crêpes-Stand', beschreibung: 'Süsse und salzige Crêpes.' },
      approved: true,
      daysAgo: 9,
    },
    {
      form: formId('stadtleben'),
      hof: hofWest,
      answers: { name: 'Seifenkistenrennen', beschreibung: 'Rennen am Samstagnachmittag.' },
      review: {
        status: 'revisionRequired',
        feedback: 'Bitte die Strecke und die Absperrung beschreiben.',
      },
      daysAgo: 4,
    },
    {
      form: formId('material-infrastruktur'),
      hof: hofWest,
      answers: {
        material: materialAnswer(forms['material-infrastruktur'] as Form, {
          Bindestrick: 20,
          Spaten: 4,
          'Baumstamm 6 m (Durchmesser 10 cm)': 12,
          'Dachlatten (27×50 mm, 4 m)': 30,
        }),
      },
      daysAgo: 3,
    },
    // Hof Nord and Hof Süd: a little each, for the Hof switch of user 8
    {
      ...plan('hofbauten'),
      hof: hofNord,
      files: { planung: ['Hofbauten Nord.pdf'] },
      daysAgo: 5,
    },
    {
      form: formId('stadtleben'),
      hof: hofSued,
      answers: { name: 'Kletterwand' },
      daysAgo: 7,
    },
  ];
  for (const submission of submissions) await createSubmission(payload, submission);

  const { id: merkblattId } = await payload.create({
    collection: 'documents',
    locale: LOCALE.DE,
    data: { title: 'Merkblatt Hofbauten (Beispiel)', permissions: permission },
    file: {
      mimetype: 'application/pdf',
      name: 'merkblatt-hofbauten.pdf',
      size: PLACEHOLDER_PDF.byteLength,
      data: PLACEHOLDER_PDF,
    },
    context: { disableRevalidation: true, skipPdfThumbnail: true },
  });

  await payload.updateGlobal({
    slug: 'hof-dashboard-settings',
    locale: LOCALE.DE,
    data: {
      deadlines: DEADLINES,
      documents: [{ document: merkblattId, area: 'infrastructure' }],
    },
    context: { internal: true },
  });

  for (const content of [
    {
      title: 'Hof-Dashboard',
      slug: 'hof-dashboard',
      block: { blockType: 'hofDashboardBlock' as const },
    },
    {
      title: 'Stadtleben',
      slug: 'stadtleben',
      block: { blockType: 'formBlock' as const, form: formId('stadtleben') },
    },
  ]) {
    await payload.create({
      collection: 'generic-page',
      locale: LOCALE.DE,
      data: page(permission, content),
      context: { disableRevalidation: true },
    });
  }
};
