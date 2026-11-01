/**
 * @jest-environment jsdom
 */

import { useFormSubmission } from '@/features/payload-cms/components/form/hooks/use-form-submission';
import type { ExtendedFormType, FormSection } from '@/features/payload-cms/components/form/types';
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

const step = (id: string, fieldName: string): FormSection =>
  ({
    id,
    sectionTitle: id,
    layout: 'standard',
    fields: [{ blockType: 'select', name: fieldName, label: fieldName }],
  }) as unknown as FormSection;

const steps = [
  step('anmeldeart', 'anmeldeart'),
  step('aufbaulager', 'aufbaulager'),
  step('einverstaendnis', 'datenschutzbestimmungen'),
];

describe('server-side field errors', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('marks the rejected field in the helper’s language and opens its step', async () => {
    // jsdom has no Response; the hook reads only `ok` and `json()`.
    const body = {
      errors: [
        {
          name: 'APIError',
          message: 'Validation Error',
          data: [
            { field: 'aufbaulager', message: 'required' },
            { field: 'hauptlager', message: 'required' },
          ],
        },
      ],
    };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: () => Promise.resolve(body) });
    const setError = jest.fn();
    const setCurrentStepIndex = jest.fn();

    const { result } = renderHook(() =>
      useFormSubmission({
        formId: 'helferanmeldung',
        config: {} as ExtendedFormType,
        locale: 'de',
        setError,
        formSections: steps,
        setCurrentStepIndex,
      }),
    );
    await act(() => result.current.submit({ anmeldeart: 'rolle' }));

    expect(setError).toHaveBeenCalledWith('aufbaulager', {
      type: 'server',
      message: 'Dieses Feld ist erforderlich.',
    });
    expect(setCurrentStepIndex).toHaveBeenCalledWith(1);
    expect(result.current.errorMessage).toBe('Bitte korrigieren Sie die markierten Fehler.');
  });
});
