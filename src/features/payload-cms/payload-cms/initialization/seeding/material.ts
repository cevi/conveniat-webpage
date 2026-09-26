/* eslint-disable unicorn/no-null */
import prisma from '@/lib/db/prisma';
import type { MaterialLoanStatus } from '@/lib/prisma/client';
import { fakerDE as faker } from '@faker-js/faker';

const JS_IMAGE_BASE = 'https://prod-jugdsport-hcms-sdweb.imgix.net/dam/de/sd-web/';
const jsImage = (path: string): string => `${JS_IMAGE_BASE}${path}?w=480&auto=format`;
const BALLSET = jsImage(
  '0XbT9c0k82D0/Ballset%20(1%20Volleyball%2C%201%20Beachvolleyball%2C%202%20Fussball%2C%201%20Handball%2C%201%20Blitzball).jpg',
);

const RETURN_DEFAULT =
  'Material vollständig und sauber zurückbringen. Beschädigungen direkt bei der Rückgabe melden.';

interface SeedItem {
  code: string;
  name: string;
  category: 'js' | 'more' | 'consumable';
  description: string;
  total: number;
  max: number;
  unit?: string;
  image?: string;
  usageNotes?: string;
  returnInstructions?: string;
  damaged?: number;
  inRepair?: number;
  lowStock?: number;
  isReservable?: boolean;
}

const ITEMS: SeedItem[] = [
  {
    code: 'JS-BINDE',
    name: 'Bindestrick',
    category: 'js',
    description: 'Sisalstrick für Lagerbauten, Pionierbauten und Seilbrücken. Länge ca. 4 m.',
    total: 200,
    max: 60,
    image: jsImage(
      'Bjt7JpZiDlsm/Bindestrick%20(bitte%20St%C3%BCckanzahl%20ben%C3%B6tigter%20Bindestricken%20eintragen).jpg',
    ),
    returnInstructions: 'Stricke aufgerollt und gebündelt zu 10 Stück zurückbringen.',
    lowStock: 20,
  },
  {
    code: 'JS-WOLL',
    name: 'Wolldecke',
    category: 'js',
    description: 'Warme Wolldecke der Armee, ideal für kalte Nächte im Zelt.',
    total: 300,
    max: 80,
    image: jsImage(
      'S7ay0rjKO1iu/Wolldecke%20(bitte%20St%C3%BCckanzahl%20ben%C3%B6tigter%20Wolldecken%20eintragen).jpg',
    ),
    returnInstructions: 'Trocken, ausgeschüttelt und zu 10 Stück gefaltet zurückbringen.',
    damaged: 4,
    lowStock: 30,
  },
  {
    code: 'JS-BEIL',
    name: 'Handbeil',
    category: 'js',
    description: 'Handbeil mit Holzstiel und Klingenschutz.',
    total: 40,
    max: 6,
    image: jsImage('lTrZpBoNUcKp/Handbeil.jpg'),
    usageNotes: 'Nur unter Aufsicht einer Leitungsperson verwenden. Klingenschutz immer aufsetzen.',
    returnInstructions: 'Klinge gereinigt und mit Klingenschutz zurückbringen.',
    inRepair: 2,
    lowStock: 5,
  },
  {
    code: 'JS-RECTA',
    name: 'Kompass Recta',
    category: 'js',
    description: 'Spiegelkompass Recta für Orientierungsläufe und Postenläufe.',
    total: 60,
    max: 20,
    image: jsImage(
      'wAdArt2k66vf/Kompass%20Recta%20(bitte%20St%C3%BCckanzahl%20ben%C3%B6tigter%20Kompasse%20eintragen).jpg',
    ),
    lowStock: 5,
  },
  {
    code: 'JS-SILVA',
    name: 'Kompass Silva',
    category: 'js',
    description: 'Plattenkompass Silva, leicht und robust.',
    total: 60,
    max: 20,
    image: jsImage(
      'xg7QGqxm-xnf/Kompass%20Silva%20(bitte%20St%C3%BCckanzahl%20ben%C3%B6tigter%20Kompasse%20eintragen).jpg',
    ),
  },
  {
    code: 'JS-PICKEL',
    name: 'Pickel',
    category: 'js',
    description: 'Kreuzpickel für Grabarbeiten in hartem Boden.',
    total: 30,
    max: 5,
    image: jsImage('PsGSeM4er9pX/Pickel.jpg'),
    returnInstructions: 'Erde abwaschen, trocken zurückbringen.',
  },
  {
    code: 'JS-SPATEN',
    name: 'Spaten',
    category: 'js',
    description: 'Spaten für Feuerstellen, Latrinen und Entwässerungsgräben.',
    total: 30,
    max: 5,
    image: jsImage('7XFvdH3jSlJ7/Spaten.jpg'),
    returnInstructions: 'Erde abwaschen, trocken zurückbringen.',
  },
  {
    code: 'JS-ZTASCHE',
    name: 'Zelttasche zu Zelttuch',
    category: 'js',
    description: 'Tasche für ein Zelttuch mit Heringen und Stangen.',
    total: 120,
    max: 30,
    image: jsImage(
      'AvRK57W2PFrO/Zelttasche%20zu%20Zelttuch%20(bitte%20St%C3%BCckanzahl%20ben%C3%B6tigter%20Zelttaschen%20eintragen).jpg',
    ),
  },
  {
    code: 'JS-ZTUCH',
    name: 'Zelttuch inkl. Zeltschnur',
    category: 'js',
    description: 'Klassisches Zelttuch der Armee mit Zeltschnur. Mehrere Tücher ergeben ein Zelt.',
    total: 400,
    max: 100,
    image: jsImage(
      '7nQ99EHqLH8a/Zelttuch%20inkl.%20Zeltschnur%20(bitte%20St%C3%BCckanzahl%20ben%C3%B6tigter%20Zeltt%C3%BCcher%20eintragen).jpg',
    ),
    returnInstructions:
      'Zelttücher nur trocken zurückbringen. Nasse Tücher vorher aufhängen, sonst schimmeln sie.',
    damaged: 6,
    lowStock: 40,
  },
  {
    code: 'JS-AUSSCH',
    name: 'Ausschusszelttuch',
    category: 'js',
    description: 'Ausgemustertes Zelttuch, darf für Bastelarbeiten und Böden verwendet werden.',
    total: 25,
    max: 10,
    image: jsImage('uehimp5veHCd/Ausschusszelttuch.jpg'),
  },
  {
    code: 'JS-BADM',
    name: 'Badmintonschläger',
    category: 'js',
    description: 'Badmintonschläger inklusive Federbälle.',
    total: 24,
    max: 8,
    image: jsImage('kaXQd78HzMRf/Badmintonschl%C3%A4ger.jpg'),
  },
  {
    code: 'JS-NETZ',
    name: 'Netz für Volleyball / Badminton',
    category: 'js',
    description: 'Netz mit Pfosten und Abspannung.',
    total: 8,
    max: 2,
    image: jsImage('1RYetSqa4nTe/Netz%20f%C3%BCr%20VolleyballBadminton_2%20copie.jpg'),
  },
  {
    code: 'JS-BEACH',
    name: 'Beachvolleyball',
    category: 'js',
    description: 'Weicher Beachvolleyball.',
    total: 10,
    max: 3,
    image: jsImage('EZtJ10siWVbF/Beachvolleyball.jpg'),
  },
  {
    code: 'JS-VOLLEY',
    name: 'Volleyball',
    category: 'js',
    description: 'Hallen- und Rasenvolleyball.',
    total: 12,
    max: 3,
    image: BALLSET,
  },
  {
    code: 'JS-FUSS',
    name: 'Fussball',
    category: 'js',
    description: 'Fussball Grösse 5.',
    total: 20,
    max: 4,
    image: BALLSET,
  },
  {
    code: 'JS-HAND',
    name: 'Handball',
    category: 'js',
    description: 'Handball Grösse 2.',
    total: 12,
    max: 3,
    image: BALLSET,
  },
  {
    code: 'JS-BLITZ',
    name: 'Blitzball',
    category: 'js',
    description: 'Weicher Ball für Blitzball und Völkerball.',
    total: 10,
    max: 3,
    image: BALLSET,
  },
  {
    code: 'WA-SCHAUF',
    name: 'Schaufel',
    category: 'more',
    description: 'Rundschaufel für Erd- und Kiesarbeiten.',
    total: 40,
    max: 6,
  },
  {
    code: 'WA-VORSCHL',
    name: 'Vorschlaghammer',
    category: 'more',
    description: 'Vorschlaghammer 5 kg zum Einschlagen von Pfählen.',
    total: 15,
    max: 2,
    usageNotes: 'Schutzbrille tragen.',
  },
  {
    code: 'WA-MSAEGE',
    name: 'Motorsäge',
    category: 'more',
    description: 'Benzin-Motorsäge für Bauholz.',
    total: 3,
    max: 1,
    usageNotes:
      'Nur mit gültigem Motorsägenkurs und vollständiger Schutzausrüstung. Wird nur direkt im Materialdepot ausgegeben.',
    returnInstructions: 'Kette gereinigt, Tank leer, mit Kettenschutz zurückbringen.',
    isReservable: false,
  },
  {
    code: 'WA-SAEGE',
    name: 'Säge',
    category: 'more',
    description: 'Bügelsäge für Rundholz bis 30 cm.',
    total: 30,
    max: 4,
    damaged: 2,
  },
  {
    code: 'WA-PAMIR',
    name: 'Pamir',
    category: 'more',
    description: 'Gehörschutz Pamir für laute Arbeiten.',
    total: 20,
    max: 4,
  },
  {
    code: 'WA-PFAHL',
    name: 'Weidezaunpfahl',
    category: 'more',
    description: 'Kunststoffpfahl zum Abgrenzen von Lagerplätzen.',
    total: 250,
    max: 60,
  },
  {
    code: 'WA-FAEHN',
    name: 'Fähnchen',
    category: 'more',
    description: 'Markierfähnchen für Postenläufe und Wegmarkierungen.',
    total: 120,
    max: 40,
  },
  {
    code: 'VM-OHR',
    name: 'Ohrenpfropfen',
    category: 'consumable',
    description: 'Einweg-Gehörschutz, Paar.',
    total: 500,
    max: 100,
    unit: 'Paar',
    returnInstructions: 'Verbrauchsmaterial, keine Rückgabe nötig.',
    lowStock: 50,
  },
  {
    code: 'VM-ABSP',
    name: 'Absperrband',
    category: 'consumable',
    description: 'Rot-weisses Absperrband, 500 m pro Rolle.',
    total: 50,
    max: 10,
    unit: 'Rollen',
    returnInstructions: 'Angebrochene Rollen bitte zurückbringen.',
    lowStock: 10,
  },
  {
    code: 'VM-KLEBE',
    name: 'Klebeband',
    category: 'consumable',
    description: 'Gewebeklebeband (Gaffa), 50 m pro Rolle.',
    total: 80,
    max: 10,
    unit: 'Rollen',
    returnInstructions: 'Angebrochene Rollen bitte zurückbringen.',
    lowStock: 10,
  },
];

/**
 * Departments of the demo. `hitobitoGroupId` matches the groups of the fake OAuth users, so
 * the "NoAccess" users see the AVP loans and the translation team those of Cevi Bern.
 */
const DEPARTMENTS = [
  { name: 'Cevi Alpnach-Vorderthal-Plöschberg', shortName: 'AVP', hitobitoGroupId: 102 },
  { name: 'Cevi Bern', shortName: 'BE', hitobitoGroupId: 106 },
  { name: 'Cevi Zürich 11', shortName: 'Z11', hitobitoGroupId: null },
  { name: 'Cevi Wetzikon', shortName: 'WET', hitobitoGroupId: null },
  { name: 'Cevi Uster', shortName: 'UST', hitobitoGroupId: null },
  { name: 'Cevi Basel', shortName: 'BS', hitobitoGroupId: null },
  { name: 'Cevi Winterthur', shortName: 'WIN', hitobitoGroupId: null },
  { name: 'UCJG Genève', shortName: 'GE', hitobitoGroupId: null },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

interface SeedLoan {
  code: string;
  quantity: number;
  status: MaterialLoanStatus;
  /** days relative to now */
  start: number;
  end: number;
  department: number;
  person?: boolean;
  consumption?: boolean;
  announced?: boolean;
  returned?: { quantity: number; condition: 'OK' | 'LIGHT_DAMAGE' | 'DAMAGED'; note?: string };
}

/**
 * A camp in full swing: some material out, some overdue, requests waiting for the material
 * team and a few returns with damage, so every view has something to show.
 */
const LOANS: SeedLoan[] = [
  { code: 'JS-ZTUCH', quantity: 60, status: 'ISSUED', start: -5, end: 4, department: 0 },
  { code: 'JS-WOLL', quantity: 40, status: 'ISSUED', start: -5, end: 4, department: 0 },
  {
    code: 'JS-BEIL',
    quantity: 2,
    status: 'ISSUED',
    start: -3,
    end: 0.3,
    department: 0,
    person: true,
  },
  { code: 'JS-RECTA', quantity: 10, status: 'ISSUED', start: -2, end: -1, department: 1 },
  { code: 'JS-SILVA', quantity: 12, status: 'ISSUED', start: -3, end: -0.5, department: 2 },
  { code: 'JS-BINDE', quantity: 40, status: 'ISSUED', start: -4, end: 3, department: 3 },
  {
    code: 'JS-BEACH',
    quantity: 3,
    status: 'ISSUED',
    start: -1,
    end: 2,
    department: 4,
    person: true,
  },
  {
    code: 'JS-BEACH',
    quantity: 3,
    status: 'ISSUED',
    start: -1,
    end: 0.2,
    department: 5,
    announced: true,
  },
  { code: 'WA-SCHAUF', quantity: 6, status: 'ISSUED', start: -2, end: 1, department: 1 },
  { code: 'WA-VORSCHL', quantity: 2, status: 'ISSUED', start: -1, end: 0.4, department: 6 },
  { code: 'JS-ZTUCH', quantity: 80, status: 'ISSUED', start: -5, end: 5, department: 2 },
  { code: 'JS-ZTASCHE', quantity: 20, status: 'ISSUED', start: -5, end: 5, department: 2 },
  { code: 'WA-SAEGE', quantity: 4, status: 'ISSUED', start: -2, end: -1.5, department: 7 },
  {
    code: 'JS-FUSS',
    quantity: 4,
    status: 'ISSUED',
    start: -1,
    end: 1,
    department: 3,
    person: true,
  },
  { code: 'JS-BADM', quantity: 8, status: 'RESERVED', start: 0.3, end: 1.3, department: 0 },
  { code: 'JS-NETZ', quantity: 2, status: 'RESERVED', start: 0.3, end: 1.3, department: 0 },
  { code: 'JS-BEACH', quantity: 4, status: 'RESERVED', start: 2, end: 3, department: 1 },
  { code: 'JS-WOLL', quantity: 60, status: 'RESERVED', start: 1, end: 6, department: 4 },
  { code: 'JS-ZTUCH', quantity: 100, status: 'RESERVED', start: 1, end: 6, department: 5 },
  { code: 'WA-PFAHL', quantity: 40, status: 'RESERVED', start: 0.5, end: 2, department: 6 },
  {
    code: 'JS-PICKEL',
    quantity: 5,
    status: 'RESERVED',
    start: 3,
    end: 4,
    department: 7,
    person: true,
  },
  {
    code: 'JS-SPATEN',
    quantity: 4,
    status: 'REQUESTED',
    start: 1,
    end: 2,
    department: 0,
    person: true,
  },
  { code: 'JS-HAND', quantity: 3, status: 'REQUESTED', start: 1, end: 1.5, department: 1 },
  { code: 'WA-FAEHN', quantity: 30, status: 'REQUESTED', start: 2, end: 3, department: 2 },
  { code: 'JS-BLITZ', quantity: 3, status: 'REQUESTED', start: 0.5, end: 1, department: 3 },
  {
    code: 'WA-PAMIR',
    quantity: 4,
    status: 'REQUESTED',
    start: 1,
    end: 2,
    department: 5,
    person: true,
  },
  {
    code: 'VM-ABSP',
    quantity: 4,
    status: 'REQUESTED',
    start: 1,
    end: 1,
    department: 6,
    consumption: true,
  },
  {
    code: 'VM-OHR',
    quantity: 50,
    status: 'RESERVED',
    start: 0.5,
    end: 0.5,
    department: 7,
    consumption: true,
  },
  {
    code: 'VM-KLEBE',
    quantity: 6,
    status: 'CONSUMED',
    start: -3,
    end: -3,
    department: 0,
    consumption: true,
  },
  {
    code: 'VM-ABSP',
    quantity: 3,
    status: 'CONSUMED',
    start: -2,
    end: -2,
    department: 4,
    consumption: true,
  },
  {
    code: 'JS-WOLL',
    quantity: 20,
    status: 'RETURNED',
    start: -6,
    end: -2,
    department: 3,
    returned: { quantity: 20, condition: 'OK' },
  },
  {
    code: 'JS-ZTUCH',
    quantity: 30,
    status: 'RETURNED',
    start: -6,
    end: -3,
    department: 6,
    returned: { quantity: 30, condition: 'DAMAGED', note: 'Zwei Tücher mit Brandlöchern.' },
  },
  {
    code: 'JS-VOLLEY',
    quantity: 3,
    status: 'RETURNED',
    start: -4,
    end: -2,
    department: 1,
    person: true,
    returned: {
      quantity: 2,
      condition: 'LIGHT_DAMAGE',
      note: 'Ein Ball verloren, einer mit wenig Luft.',
    },
  },
  { code: 'JS-BINDE', quantity: 30, status: 'CANCELLED', start: 1, end: 3, department: 7 },
];

/**
 * Seeds the material depot: the catalogue from the conveniat27 material list, the departments
 * and a mix of loans. Wipes the material tables first, so it can run again on its own.
 */
export const seedMaterial = async (userIds: string[]): Promise<void> => {
  console.log('Seeding: Creating material catalogue and loans...');

  await prisma.materialIncident.deleteMany();
  await prisma.materialLoan.deleteMany();
  await prisma.materialItem.deleteMany();
  await prisma.materialCategory.deleteMany();
  await prisma.materialDepartment.deleteMany();

  const categories = {
    js: await prisma.materialCategory.create({ data: { name: 'J+S-Material', sortOrder: 0 } }),
    more: await prisma.materialCategory.create({ data: { name: 'Weitere Artikel', sortOrder: 1 } }),
    consumable: await prisma.materialCategory.create({
      data: { name: 'Verbrauchsmaterial', sortOrder: 2 },
    }),
  };

  const itemIds = new Map<string, string>();
  for (const item of ITEMS) {
    const created = await prisma.materialItem.create({
      data: {
        code: item.code,
        name: item.name,
        description: item.description,
        usageNotes: item.usageNotes ?? null,
        returnInstructions: item.returnInstructions ?? RETURN_DEFAULT,
        imageUrl: item.image ?? null,
        unit: item.unit ?? 'Stück',
        categoryId: categories[item.category].id,
        totalQuantity: item.total,
        maxLoanQuantity: item.max,
        damagedQuantity: item.damaged ?? 0,
        inRepairQuantity: item.inRepair ?? 0,
        lowStockThreshold: item.lowStock ?? 0,
        isConsumable: item.category === 'consumable',
        isReservable: item.isReservable ?? true,
      },
    });
    itemIds.set(item.code, created.id);
  }

  const departmentIds: string[] = [];
  for (const department of DEPARTMENTS) {
    const created = await prisma.materialDepartment.create({
      data: { ...department, contactName: faker.person.fullName() },
    });
    departmentIds.push(created.id);
  }

  const people = await prisma.user.findMany({
    where: { uuid: { in: userIds } },
    select: { uuid: true, name: true },
  });
  const creator = people[0];
  if (!creator) {
    console.warn('Seeding: No users in Postgres, skipping material loans.');
    return;
  }

  const now = Date.now();
  for (const [index, loan] of LOANS.entries()) {
    const person = loan.person === true ? people[index % people.length] : undefined;
    const startDate = new Date(now + loan.start * DAY);
    const endDate = new Date(now + loan.end * DAY);
    const handedOut = ['ISSUED', 'RETURNED', 'CONSUMED'].includes(loan.status);

    const created = await prisma.materialLoan.create({
      data: {
        itemId: itemIds.get(loan.code) ?? '',
        quantity: loan.quantity,
        departmentId: departmentIds[loan.department] ?? '',
        personId: person?.uuid ?? null,
        responsibleName: person?.name ?? faker.person.fullName(),
        comment: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) ?? null,
        startDate,
        endDate,
        isConsumption: loan.consumption === true,
        status: loan.status,
        issuedQuantity: handedOut ? loan.quantity : null,
        issuedAt: handedOut ? startDate : null,
        returnAnnouncedAt: loan.announced === true ? new Date(now - HOUR) : null,
        returnedQuantity: loan.returned?.quantity ?? null,
        returnedAt: loan.returned ? endDate : null,
        returnCondition: loan.returned?.condition ?? null,
        returnNote: loan.returned?.note ?? null,
        createdById: creator.uuid,
      },
    });

    if (loan.returned && loan.returned.condition !== 'OK') {
      await prisma.materialIncident.create({
        data: {
          itemId: created.itemId,
          loanId: created.id,
          condition: loan.returned.condition,
          quantity: loan.returned.condition === 'DAMAGED' ? 2 : 1,
          note: loan.returned.note ?? '',
          reportedById: creator.uuid,
        },
      });
    }
  }

  console.log(`Seeding: Created ${ITEMS.length} material items and ${LOANS.length} loans.`);
};
