import { HOF_SUBMISSION_TYPE_AREA, HOF_SUBMISSION_TYPES } from '@/features/hof-dashboard/constants';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Form, GenericPage, Permission } from '@/features/payload-cms/payload-types';
import type { Payload, RequiredDataFromCollectionSlug } from 'payload';

const INFRASTRUCTURE_SUBMISSIONS = HOF_SUBMISSION_TYPES.filter(
  (type) => HOF_SUBMISSION_TYPE_AREA[type] === 'infrastructure',
);

/** The deadlines, material lists and safety criteria from the Ressorts' concept for the dashboard. */
const settings = {
  deadlines: [
    {
      date: '2027-01-31T12:00:00.000Z',
      title: '1. Abgabe Grobkonzept Abteilungsbauten',
      area: 'infrastructure' as const,
      submissionTypes: [...INFRASTRUCTURE_SUBMISSIONS],
    },
    {
      date: '2027-01-31T12:00:00.000Z',
      title: 'Abgabe Hofprogramme',
      area: 'program' as const,
      submissionTypes: ['hofProgram' as const],
    },
    {
      date: '2027-03-31T12:00:00.000Z',
      title: '2. Abgabe Grobkonzept Abteilungsbauten (falls vom Ressort Infrastruktur verlangt)',
      area: 'infrastructure' as const,
      submissionTypes: [...INFRASTRUCTURE_SUBMISSIONS],
    },
    {
      date: '2027-05-31T12:00:00.000Z',
      title: 'Abgabe Feinkonzept Abteilungsbauten',
      area: 'infrastructure' as const,
      submissionTypes: [...INFRASTRUCTURE_SUBMISSIONS],
    },
  ],
  infrastructureOrder: {
    deadline: '2027-01-31T12:00:00.000Z',
    items: [
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
    ],
  },
  stadtlebenOrder: {
    items: [
      { name: 'Manipulierseil (10–15 m)' },
      { name: 'Zelttuch inkl. Zeltschnur' },
      { name: 'Ausschusszelttuch' },
      { name: 'Zelttasche zu Zelttuch' },
      { name: 'Festtisch' },
      { name: 'Festbank' },
    ],
  },
  stadtlebenDeadline: '2027-01-31T12:00:00.000Z',
  stadtlebenTitleFieldName: 'name',
  stadtlebenFormUrl: '/stadtleben',
  safetyRiskCriteria: [
    'Alle Aktivitäten ausserhalb des Lagergeländes (ausgenommen offizielle Programmteile)',
    'Bauten und Türme mit Absturzmöglichkeiten von mehr als 3 Metern Plattformhöhe',
    'Bauten, Türme und Grosszelte mit einer Mastenlänge von über 6 Metern',
    'Umzäunungen, Einfriedungen, Sichtschutz (aus Blachen, Holz, Heuballen usw.)',
    'Events und Programmblöcke mit mehr als 500 Personen',
    'Einsätze und Aktionen mit Feuer, Pyro, Rauch, Wasser, Gas, Chemikalien usw.',
    'Sicherheitsrelevante oder verletzungsgefährliche Programmpunkte',
    'Alle Verkaufsstände, Restaurants, Bars oder externe Zelte auf dem Lagergelände',
    'Aktionen ausserhalb des üblichen Zeitrahmens (nach 23:00 oder vor 07:00 Uhr)',
  ].map((criterion) => ({ criterion })),
};

/** A one-page PDF standing in for the real Merkblatt Hofbauten. */
const PLACEHOLDER_PDF = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj
trailer << /Root 1 0 R >>
%%EOF
`;

const paragraph = (text: string): NonNullable<Form['confirmationMessage']> => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
});

/** A short stand registration that asks for the Hof, like the real Stadtleben form once it has a Hof selection. */
const stadtlebenForm = {
  title: 'Standanmeldung fürs Stadtleben',
  confirmationType: 'message',
  confirmationMessage: paragraph('Vielen Dank für deine Standanmeldung fürs Stadtleben!'),
  sections: [
    {
      formSection: {
        sectionTitle: 'Standanmeldung fürs Stadtleben',
        layout: 'standard',
        fields: [
          { blockType: 'text', name: 'name', label: 'Name des Standes', required: true },
          { blockType: 'hofSelection', name: 'hof', label: 'Hof', required: true },
        ],
      },
    },
  ],
  submitButtonLabel: 'Standanmeldung abschliessen',
  _localized_status: { published: true },
  _locale: 'de',
  _status: 'published',
} as unknown as RequiredDataFromCollectionSlug<'forms'>;

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

/**
 * The Hof dashboard of the dev seed: its settings, contacts on Hof Nord, a page with the
 * dashboard, and a Stadtleben form whose registrations show up on it. The fake login
 * "Hof-Adressverwaltung" administers Hof Nord and Hof Süd.
 */
export const seedHofDashboard = async (payload: Payload, permission: Permission): Promise<void> => {
  const { docs: hoefe } = await payload.find({
    collection: 'hoefe',
    where: { groupId: { in: ['990001', '990002'] } },
    depth: 0,
    limit: 2,
    sort: 'groupId',
  });
  const [hofNord, hofSued] = hoefe;
  if (hofNord === undefined || hofSued === undefined) return;

  await payload.update({
    collection: 'hoefe',
    id: hofNord.id,
    data: {
      dashboardContacts: {
        avp: {
          name: 'Anna Beispiel v/o Fuchs',
          email: 'avp@hof-nord.example.com',
          phone: '079 123 45 67',
        },
        coach: {
          name: 'Thomas Muster v/o Dachs',
          email: 'coach@example.com',
          phone: '076 987 65 43',
        },
        buildingManager: {
          name: 'Sara Keller v/o Biber',
          email: 'bau@hof-nord.example.com',
          phone: '078 234 56 78',
        },
      },
    },
    context: { internal: true },
  });

  const { id: formId } = await payload.create({
    collection: 'forms',
    data: stadtlebenForm,
    locale: LOCALE.DE,
    context: { disableRevalidation: true, validate: false },
  });
  // written directly: the submission hooks would look the form up in a request scope
  for (const [name, hof, approved] of [
    ['Büchsenschiessen', hofNord.id, true],
    ['Seifenkistenrennen', hofNord.id, false],
    ['Kletterwand', hofSued.id, false],
  ] as const) {
    await payload.db.create({
      collection: 'form-submissions',
      data: {
        form: formId,
        hof,
        approved,
        submissionData: [
          { field: 'name', value: name },
          { field: 'hof', value: hof === hofNord.id ? hofNord.name : hofSued.name },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }

  const merkblatt = Buffer.from(PLACEHOLDER_PDF);
  const { id: merkblattId } = await payload.create({
    collection: 'documents',
    locale: LOCALE.DE,
    data: { title: 'Merkblatt Hofbauten (Beispiel)', permissions: permission },
    file: {
      mimetype: 'application/pdf',
      name: 'merkblatt-hofbauten.pdf',
      size: merkblatt.byteLength,
      data: merkblatt,
    },
    context: { disableRevalidation: true, skipPdfThumbnail: true },
  });

  await payload.updateGlobal({
    slug: 'hof-dashboard-settings',
    locale: LOCALE.DE,
    data: {
      ...settings,
      stadtlebenForm: formId,
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
      block: { blockType: 'formBlock' as const, form: formId },
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
