import type { MaterialLoanStatus } from '@/lib/prisma/client';

/**
 * Who has a loan: the person it is booked on, otherwise its Hof. A loan booked on a person
 * with a Hof still belongs to the person, who took it and brings it back.
 */
export type LoanHolder = { kind: 'HOF'; id: string } | { kind: 'PERSON'; id: string };

interface HolderFields {
  hofId: string | null;
  personId: string | null;
}

/** `undefined` only for a row that breaks the rule that every loan has a Hof or a person. */
export const holderOf = (loan: HolderFields): LoanHolder | undefined => {
  if (loan.personId !== null) return { kind: 'PERSON', id: loan.personId };
  if (loan.hofId !== null) return { kind: 'HOF', id: loan.hofId };
  return undefined;
};

export const holderKey = (holder: LoanHolder): string =>
  `${holder.kind === 'HOF' ? 'hof' : 'person'}:${holder.id}`;

/**
 * The holder a depot page is opened for, from `?hof=` or `?person=`, as the overview and the
 * inventory link it. Anything else, both or neither, opens no holder.
 */
export const holderFromSearch = (parameters: {
  get: (name: string) => string | null;
}): LoanHolder | undefined => {
  const hof = parameters.get('hof')?.trim() ?? '';
  const person = parameters.get('person')?.trim() ?? '';
  if (hof !== '' && person === '') return { kind: 'HOF', id: hof };
  if (person !== '' && hof === '') return { kind: 'PERSON', id: person };
  return undefined;
};

/** The query string that opens a holder, the reverse of `holderFromSearch`. */
export const holderSearch = (holder: LoanHolder): string =>
  `${holder.kind === 'HOF' ? 'hof' : 'person'}=${encodeURIComponent(holder.id)}`;

export interface GroupableLoan extends HolderFields {
  hof: { name: string } | null;
  person: { name: string } | null;
}

export interface HolderGroup<Loan> {
  key: string;
  holder: LoanHolder;
  /** `null` for a Hof that has been deleted since */
  name: string | null;
  loans: Loan[];
}

/**
 * Loans by holder, in the order each holder first appears. `split` separates one holder's
 * loans further, such as requests for different pickup days.
 */
export const groupByHolder = <Loan extends GroupableLoan>(
  loans: readonly Loan[],
  split?: (loan: Loan) => string,
): HolderGroup<Loan>[] => {
  const groups = new Map<string, HolderGroup<Loan>>();
  for (const loan of loans) {
    const holder = holderOf(loan);
    if (holder === undefined) continue;
    const key = split === undefined ? holderKey(holder) : `${holderKey(holder)}@${split(loan)}`;
    const group = groups.get(key) ?? {
      key,
      holder,
      // eslint-disable-next-line unicorn/no-null -- a Hof deleted since has no name
      name: holder.kind === 'PERSON' ? (loan.person?.name ?? null) : (loan.hof?.name ?? null),
      loans: [],
    };
    group.loans.push(loan);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** The last moment of the reader's day, which is what "today" means at the counter. */
export const endOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

interface QueueLoan extends GroupableLoan {
  status: MaterialLoanStatus;
  startDate: Date;
  endDate: Date;
  /** absent in a loan restored from an older app version */
  returnAnnouncedAt?: Date | null;
}

/** The reader's day of a date, the key a request is grouped by. */
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

/** Whether the borrower said the loan is on its way back. */
export const isAnnounced = (loan: {
  status: MaterialLoanStatus;
  returnAnnouncedAt?: Date | null;
}): boolean => loan.status === 'ISSUED' && loan.returnAnnouncedAt instanceof Date;

export interface CounterQueue<Loan> {
  /** asked for and waiting for the material team, one group per holder and pickup day */
  requests: HolderGroup<Loan>[];
  /** prepared for a pickup until the end of the day, the ones waiting longest first */
  pickups: HolderGroup<Loan>[];
  /** prepared for a later day */
  later: HolderGroup<Loan>[];
  /** out and announced, or due back until the end of the day; announced first, then overdue */
  returns: HolderGroup<Loan>[];
}

const byStart = (a: QueueLoan, b: QueueLoan): number =>
  a.startDate.getTime() - b.startDate.getTime();
const byEnd = (a: QueueLoan, b: QueueLoan): number => a.endDate.getTime() - b.endDate.getTime();

/**
 * What the counter works through on a day ending at `dayEnd`: requests to answer, pickups that
 * are ready, the ones for later days, and the material that should come back. Sorting the loans before grouping
 * orders the groups by their most urgent loan.
 */
export const buildCounterQueue = <Loan extends QueueLoan>(
  loans: readonly Loan[],
  dayEnd: Date,
): CounterQueue<Loan> => {
  const reserved = loans.filter((loan) => loan.status === 'RESERVED').toSorted(byStart);
  const byAnnouncedThenEnd = (a: Loan, b: Loan): number => {
    const announced = Number(isAnnounced(b)) - Number(isAnnounced(a));
    return announced === 0 ? byEnd(a, b) : announced;
  };
  return {
    requests: groupByHolder(
      loans.filter((loan) => loan.status === 'REQUESTED').toSorted(byStart),
      (loan) => dayKey(loan.startDate),
    ),
    pickups: groupByHolder(reserved.filter((loan) => loan.startDate <= dayEnd)),
    later: groupByHolder(reserved.filter((loan) => loan.startDate > dayEnd)),
    returns: groupByHolder(
      loans
        .filter((loan) => loan.status === 'ISSUED' && (loan.endDate <= dayEnd || isAnnounced(loan)))
        .toSorted(byAnnouncedThenEnd),
    ),
  };
};
