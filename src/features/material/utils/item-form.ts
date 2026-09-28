import { z } from 'zod';

export const ITEM_CODE_PATTERN = /^[A-Z0-9-]{2,24}$/;

export type ItemFormProblem = 'code' | 'imageUrl' | 'maxLoanQuantity' | 'orderStep';

/**
 * What the server would reject in the article form, checked before sending so the reader
 * sees a sentence next to the field instead of a validation dump.
 */
export const getItemFormProblems = (form: {
  code: string;
  imageUrl: string;
  maxLoanQuantity: number;
  orderStep: number;
}): Set<ItemFormProblem> => {
  const problems = new Set<ItemFormProblem>();
  if (!ITEM_CODE_PATTERN.test(form.code.trim().toUpperCase())) problems.add('code');
  const imageUrl = form.imageUrl.trim();
  // the same check the server runs, so both agree on what a link is
  if (imageUrl !== '' && !z.string().url().safeParse(imageUrl).success) problems.add('imageUrl');
  if (!Number.isInteger(form.maxLoanQuantity) || form.maxLoanQuantity < 1) {
    problems.add('maxLoanQuantity');
  }
  // a step above the most per loan leaves nothing a participant could ask for
  if (
    !Number.isInteger(form.orderStep) ||
    form.orderStep < 1 ||
    form.orderStep > Math.max(form.maxLoanQuantity, 1)
  ) {
    problems.add('orderStep');
  }
  return problems;
};
