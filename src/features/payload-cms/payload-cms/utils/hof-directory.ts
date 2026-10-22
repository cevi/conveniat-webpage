import type { Payload } from 'payload';

/** A Quartier as the camp knows it: "Quartier 5 - Greif", number 5, Rufname "Greif". */
export interface HofQuartier {
  id: string;
  name: string;
  /** absent until the editors number the Quartier */
  number?: number | undefined;
  rufname?: string | undefined;
}

/** What the camp may know about a Hof: its name and its Quartier. */
export interface HofLabel {
  name: string;
  quartier: HofQuartier | undefined;
}

const toHofQuartier = (quartier: {
  id: string;
  name: string;
  number?: number | null;
  rufname?: string | null;
}): HofQuartier => ({
  id: quartier.id,
  name: quartier.name,
  ...(typeof quartier.number === 'number' ? { number: quartier.number } : {}),
  ...(typeof quartier.rufname === 'string' && quartier.rufname !== ''
    ? { rufname: quartier.rufname }
    : {}),
});

/**
 * Every Hof by id, with its name and its Quartier. Selects nothing else, so the address fields
 * of the billing never leave the server through it. A few dozen documents.
 */
export const getHofDirectory = async (payload: Payload): Promise<Map<string, HofLabel>> => {
  const { docs } = await payload.find({
    collection: 'hoefe',
    depth: 1,
    pagination: false,
    overrideAccess: true,
    select: { name: true, quartier: true },
    populate: { quartiere: { name: true, number: true, rufname: true } },
  });
  return new Map(
    docs.map((hof) => [
      hof.id,
      {
        name: hof.name,
        quartier:
          typeof hof.quartier === 'object' && hof.quartier !== null
            ? toHofQuartier(hof.quartier)
            : undefined,
      },
    ]),
  );
};

/**
 * The names of a user's Höfe and of their Quartiere, each once. A Hof that no longer exists
 * is left out.
 */
export const describeHoefe = (
  hofIds: string[],
  directory: Map<string, HofLabel>,
): { hoefe: string[]; quartiere: string[] } => {
  const labels = hofIds
    .map((id) => directory.get(id))
    .filter((label): label is HofLabel => label !== undefined);
  return {
    hoefe: labels.map((label) => label.name),
    quartiere: [
      ...new Set(labels.map((label) => label.quartier?.name).filter((name) => name !== undefined)),
    ],
  };
};

/** A person's place at one Hof, as the address book shows it. */
export interface HofRole {
  hof: string;
  quartier: string | undefined;
  /** whether the person holds the Hauptleitung of the Hof's camp, i.e. is its AVP */
  isAvp: boolean;
}

/** A person's Höfe, each with its Quartier and whether they are its AVP. Unknown Höfe are left out. */
export const describeHofRoles = (
  hofIds: string[],
  avpHofIds: string[],
  directory: Map<string, HofLabel>,
): HofRole[] =>
  hofIds.flatMap((id) => {
    const label = directory.get(id);
    if (label === undefined) return [];
    return [{ hof: label.name, quartier: label.quartier?.name, isAvp: avpHofIds.includes(id) }];
  });

/**
 * The Hof line under a person, one part per Hof, e.g. "AVP, Cevi Uster, Quartier 3" for the
 * Hof's AVP and "Züri 11, Quartier 1" for everyone else. Empty for someone at no Hof.
 */
export const formatHofRoles = (roles: readonly HofRole[]): string =>
  roles
    .map(({ hof, quartier, isAvp }) =>
      [isAvp ? 'AVP' : undefined, hof, quartier]
        .filter((part) => part !== undefined && part !== '')
        .join(', '),
    )
    .join(' · ');
