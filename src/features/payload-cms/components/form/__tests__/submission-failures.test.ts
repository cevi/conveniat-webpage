/**
 * @jest-environment jsdom
 */

import { useFormSubmission } from '@/features/payload-cms/components/form/hooks/use-form-submission';
import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import type { Locale } from '@/types/types';
import { act, renderHook } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: (): { push: jest.Mock } => ({ push: jest.fn() }),
}));

jest.mock('@/providers/posthog-context', () => ({
  usePostHog: (): undefined => undefined,
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'http://localhost:3000' },
}));

/** What the form shows after one submission that `fetch` answers as given. */
const errorShownFor = async (
  fetchImpl: () => Promise<unknown>,
  locale: Locale = 'de',
): Promise<string | undefined> => {
  globalThis.fetch = jest.fn(fetchImpl) as unknown as typeof fetch;
  const { result } = renderHook(() =>
    useFormSubmission({ formId: 'kontakt', config: {} as ExtendedFormType, locale }),
  );
  await act(() => result.current.submit({ nachricht: 'Wann beginnt der Aufbau?' }));
  expect(result.current.status).toBe('error');
  return result.current.errorMessage;
};

/** A response as the hook reads it: `ok`, `status` and `json()`. */
const answer = (status: number, json: () => Promise<unknown>): Promise<unknown> =>
  Promise.resolve({ ok: false, status, json });

/** What `json()` does with nginx's 502 page. */
const htmlPage = (): Promise<unknown> => Promise.reject(new SyntaxError('Unexpected token <'));

describe('a submission that fails', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('says there is no connection instead of the browser’s English', async () => {
    expect(await errorShownFor(() => Promise.reject(new TypeError('Failed to fetch')))).toBe(
      'Keine Verbindung. Versuche es erneut, sobald du wieder Empfang hast.',
    );
  });

  it('does not show the parse error of an HTML error page', async () => {
    expect(await errorShownFor(() => answer(502, htmlPage), 'en')).toBe(
      'Failed to submit form. Please try again later.',
    );
  });

  it('says why a hook refused it, in the language of the page', async () => {
    const body = {
      errors: [{ message: 'This job is already full.', data: { reason: 'jobFull' } }],
    };

    expect(await errorShownFor(() => answer(400, () => Promise.resolve(body)), 'fr')).toBe(
      'Ce job est déjà complet.',
    );
  });

  it('does not pass on a message that names no reason', async () => {
    const body = { errors: [{ message: 'You are not allowed to perform this action.' }] };

    expect(await errorShownFor(() => answer(403, () => Promise.resolve(body)))).toBe(
      'Formularübermittlung fehlgeschlagen. Bitte versuchen Sie es später erneut.',
    );
  });
});
