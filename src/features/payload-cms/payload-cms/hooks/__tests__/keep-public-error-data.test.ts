import { keepPublicErrorData } from '@/features/payload-cms/payload-cms/hooks/keep-public-error-data';
import type { AfterErrorHookArgs } from 'payload';

/**
 * Shaped like Payload's APIError, but not an instance of it: in the production build the class
 * our hooks throw is not the one Payload's error formatter checks against.
 */
const apiError = (data: unknown, isPublic: boolean): Error =>
  Object.assign(new Error('Validation Error'), { name: 'APIError', status: 400, data, isPublic });

const answer = (error: Error): ReturnType<typeof keepPublicErrorData> =>
  keepPublicErrorData({
    error,
    context: {},
    req: { headers: new Headers() },
  } as unknown as AfterErrorHookArgs);

describe('keepPublicErrorData', () => {
  it('keeps the field errors the form needs to mark the rejected fields', () => {
    const fieldErrors = [
      { field: 'aufbaulager', message: 'required' },
      { field: 'hauptlager', message: 'required' },
    ];

    expect(answer(apiError(fieldErrors, true))).toEqual({
      response: {
        errors: [{ name: 'APIError', data: fieldErrors, message: 'Validation Error' }],
      },
    });
  });

  it('never hands the data of an internal error to the client', () => {
    expect(answer(apiError([{ field: 'secret', message: 'x' }], false))).toBeUndefined();
  });

  it('leaves errors without data and other errors as Payload answers them', () => {
    expect(answer(apiError(undefined, true))).toBeUndefined();
    expect(answer(new Error('boom'))).toBeUndefined();
  });
});
