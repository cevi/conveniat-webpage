import type { Payload } from 'payload';

/**
 * The seeded Höfe by Quartier. Hof West stays without one, so the local stack shows a Hof
 * that has not been placed yet.
 */
const HOEFE_BY_QUARTIER: string[][] = [['Hof Nord', 'Hof Ost'], ['Hof Süd']];

/** The Rufnamen of the camp's Quartiere, by number from 1. */
const RUFNAMEN = [
  'Einhorn',
  'Kelpie',
  'Wolpertinger',
  'Kitsune',
  'Greif',
  'Cerberus',
  'Phoenix',
  'Baku',
] as const;

/**
 * Creates a Quartier for each seeded camp site, which the camp map already names
 * "Quartier 1", "Quartier 2" and so on, with the camp's Rufnamen, and places the seeded Höfe in
 * the first ones.
 */
export const seedQuartiere = async (payload: Payload, campSiteIds: string[]): Promise<void> => {
  const { docs: hoefe } = await payload.find({
    collection: 'hoefe',
    depth: 0,
    pagination: false,
    select: { name: true },
  });

  for (const [index, mapAnnotation] of campSiteIds.entries()) {
    const number = index + 1;
    const rufname = RUFNAMEN[index];
    const { id: quartierId } = await payload.create({
      collection: 'quartiere',
      data:
        rufname === undefined
          ? { name: `Quartier ${String(number)}`, number, mapAnnotation }
          : { name: `Quartier ${String(number)} - ${rufname}`, number, rufname, mapAnnotation },
    });

    for (const hofName of HOEFE_BY_QUARTIER[index] ?? []) {
      const hof = hoefe.find(({ name }) => name === hofName);
      if (hof === undefined) continue;
      await payload.update({
        collection: 'hoefe',
        id: hof.id,
        data: { quartier: quartierId },
        context: { internal: true },
      });
    }
  }
};
