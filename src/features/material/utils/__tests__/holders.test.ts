import {
  buildCounterQueue,
  endOfDay,
  groupByHolder,
  holderFromSearch,
  holderOf,
  holderSearch,
} from '@/features/material/utils/holders';
import type { MaterialLoanStatus } from '@/lib/prisma/client';

const at = (day: number, hour = 12): Date => new Date(2027, 6, day, hour);

interface TestLoan {
  id: string;
  status: MaterialLoanStatus;
  hofId: string | null;
  personId: string | null;
  hof: { name: string } | null;
  person: { name: string } | null;
  startDate: Date;
  endDate: Date;
}

/* eslint-disable unicorn/no-null -- the columns are nullable, as the server sends them */
const onHof = (id: string, overrides: Partial<TestLoan> = {}): TestLoan => ({
  id,
  status: 'ISSUED',
  hofId: 'nord',
  personId: null,
  hof: { name: 'Hof Nord' },
  person: null,
  startDate: at(20),
  endDate: at(24),
  ...overrides,
});

const onPerson = (id: string, overrides: Partial<TestLoan> = {}): TestLoan =>
  onHof(id, { personId: 'lea', person: { name: 'Lea' }, ...overrides });

describe('holderOf', () => {
  it('gives a loan to its person before its Hof', () => {
    expect(holderOf(onPerson('1'))).toEqual({ kind: 'PERSON', id: 'lea' });
    expect(holderOf(onPerson('2', { hofId: null }))).toEqual({ kind: 'PERSON', id: 'lea' });
    expect(holderOf(onHof('3'))).toEqual({ kind: 'HOF', id: 'nord' });
  });

  it('finds no holder on a loan that has neither', () => {
    expect(holderOf({ hofId: null, personId: null })).toBeUndefined();
  });
});

const read = (query: string): ReturnType<typeof holderFromSearch> =>
  holderFromSearch(new URLSearchParams(query));

describe('holderFromSearch', () => {
  it('reads a Hof or a person, and nothing when both or neither are given', () => {
    expect(read('hof=nord')).toEqual({ kind: 'HOF', id: 'nord' });
    expect(read('person=lea&loan=4')).toEqual({ kind: 'PERSON', id: 'lea' });
    expect(read('hof=nord&person=lea')).toBeUndefined();
    expect(read('hof=%20')).toBeUndefined();
    expect(read('')).toBeUndefined();
  });

  it('writes what it reads', () => {
    const holder = { kind: 'HOF', id: 'süd 2' } as const;
    expect(read(holderSearch(holder))).toEqual(holder);
  });
});

describe('groupByHolder', () => {
  it('keeps the Hof apart from a person booked with it, in order of appearance', () => {
    const groups = groupByHolder([
      onHof('1'),
      onPerson('2'),
      onHof('3'),
      onHof('4', { hof: null }),
    ]);
    expect(groups.map((group) => [group.key, group.name, group.loans.map((l) => l.id)])).toEqual([
      ['hof:nord', 'Hof Nord', ['1', '3', '4']],
      ['person:lea', 'Lea', ['2']],
    ]);
  });

  it('names a deleted Hof with null', () => {
    expect(groupByHolder([onHof('1', { hof: null })])[0]?.name).toBeNull();
  });
});

describe('buildCounterQueue', () => {
  const dayEnd = endOfDay(at(21));

  it('lists pickups prepared until today, and the later ones apart', () => {
    const queue = buildCounterQueue(
      [
        onHof('today', { status: 'RESERVED', startDate: at(21, 14) }),
        onPerson('yesterday', { status: 'RESERVED', startDate: at(20) }),
        onHof('tomorrow', { status: 'RESERVED', startDate: at(22, 0) }),
        onHof('out', { status: 'ISSUED' }),
      ],
      dayEnd,
    );
    expect(queue.pickups.map((group) => group.loans.map((loan) => loan.id))).toEqual([
      ['yesterday'],
      ['today'],
    ]);
    expect(queue.later.flatMap((group) => group.loans.map((loan) => loan.id))).toEqual([
      'tomorrow',
    ]);
  });

  it('takes back what is due today and what is overdue, overdue first', () => {
    const queue = buildCounterQueue(
      [
        onHof('due', { endDate: at(21, 23) }),
        onPerson('overdue', { endDate: at(19) }),
        onHof('later', { endDate: at(22, 1) }),
        onHof('returned', { status: 'RETURNED', endDate: at(19) }),
        onHof('prepared', { status: 'RESERVED', endDate: at(19) }),
      ],
      dayEnd,
    );
    expect(queue.returns.map((group) => [group.key, group.loans.map((loan) => loan.id)])).toEqual([
      ['person:lea', ['overdue']],
      ['hof:nord', ['due']],
    ]);
  });
});
