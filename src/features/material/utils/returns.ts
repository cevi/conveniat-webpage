import type { MaterialCondition } from '@/lib/prisma/client';

/**
 * Whether a check-in makes sense before it is sent: "missing" needs pieces that did not come
 * back, and a damage needs pieces that did, with at least one of them damaged.
 */
export const isReturnValid = ({
  issued,
  returned,
  condition,
  damaged,
}: {
  issued: number;
  returned: number;
  condition: MaterialCondition;
  damaged: number;
}): boolean => {
  if (returned < 0 || returned > issued) return false;
  switch (condition) {
    case 'MISSING': {
      return returned < issued;
    }
    case 'LIGHT_DAMAGE': {
      return returned > 0;
    }
    case 'DAMAGED': {
      return returned > 0 && damaged >= 1 && damaged <= returned;
    }
    default: {
      return true;
    }
  }
};

/** One line of a check-in as the counter edits it. */
export interface ReturnDraft {
  issued: number;
  returned: number;
  condition: MaterialCondition;
  /** only read for `DAMAGED` */
  damaged: number;
}

/** The default at the counter: everything back, nothing wrong. */
export const completeReturn = (issued: number): ReturnDraft => ({
  issued,
  returned: issued,
  condition: 'OK',
  damaged: 1,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(max, min));

/**
 * Changes how many pieces came back. Fewer than went out reads as "missing" unless the line is
 * already marked damaged, and all of them back again undoes "missing".
 */
export const withReturned = (draft: ReturnDraft, returned: number): ReturnDraft => {
  const next = clamp(returned, 0, draft.issued);
  let condition = draft.condition;
  if (condition === 'OK' && next < draft.issued) condition = 'MISSING';
  if (condition === 'MISSING' && next === draft.issued) condition = 'OK';
  return { ...draft, returned: next, condition, damaged: clamp(draft.damaged, 1, next) };
};

/**
 * Picks a condition chip. "OK" means everything is back; "missing" takes one piece off when
 * all were counted back; "damaged" needs at least one piece back to be damaged.
 */
export const withCondition = (draft: ReturnDraft, condition: MaterialCondition): ReturnDraft => {
  switch (condition) {
    case 'OK': {
      return { ...draft, condition, returned: draft.issued };
    }
    case 'MISSING': {
      const returned = draft.returned === draft.issued ? draft.issued - 1 : draft.returned;
      return { ...draft, condition, returned: Math.max(returned, 0) };
    }
    default: {
      const returned = draft.returned === 0 ? draft.issued : draft.returned;
      return { ...draft, condition, returned, damaged: clamp(draft.damaged, 1, returned) };
    }
  }
};
