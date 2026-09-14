/**
 * @jest-environment jsdom
 */

import { FormBlock } from '@/features/payload-cms/components/form';
import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import { getFormStorageKey } from '@/features/payload-cms/components/form/utils/get-form-storage-key';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock('@/providers/posthog-context', () => ({
  usePostHog: (): undefined => undefined,
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'http://localhost:3000' },
}));

const submitSpy = jest.fn();

jest.mock('@/features/payload-cms/components/form/hooks/use-form-submission', () => ({
  useFormSubmission: (): Record<string, unknown> => ({
    status: 'idle',
    errorMessage: '',
    previewData: undefined,
    submit: submitSpy,
    reset: jest.fn(),
  }),
}));

/*
 * The real field renderer transitively pulls untranspiled ESM (lexical, next-auth) that jest
 * cannot load. Which step is shown is decided before rendering any field, so a plain
 * registered <input> per field is enough.
 */
jest.mock('@/features/payload-cms/components/form/components/form-field-renderer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  const react = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  const rhf = require('react-hook-form') as typeof import('react-hook-form');
  return {
    FormFieldRenderer: ({
      section,
    }: {
      section: { fields: { name: string; label: string }[] };
    }): React.ReactNode => {
      const { register } = rhf.useFormContext();
      return react.createElement(
        react.Fragment,
        undefined,
        ...section.fields.map((f) =>
          react.createElement(
            'div',
            { key: f.name },
            react.createElement('label', { htmlFor: f.name }, f.label),
            react.createElement('input', { id: f.name, ...register(f.name) }),
          ),
        ),
      );
    },
  };
});

jest.mock('@/features/payload-cms/components/form/components/submission-message', () => ({
  SubmissionMessage: (): undefined => undefined,
}));

// reaches for @payload-config (server-only) at import time
jest.mock('@/features/payload-cms/components/form/job-selection', () => ({
  JobSelectionProvider: ({ children }: { children: React.ReactNode }): React.ReactNode => children,
}));

const section = (
  sectionTitle: string,
  fieldName: string,
  displayCondition?: { field: string; value: string },
): unknown => ({
  formSection: {
    sectionTitle,
    layout: 'standard',
    displayCondition,
    fields: [{ blockType: 'text', name: fieldName, label: fieldName }],
  },
});

const config = {
  id: 'test-form',
  title: 'Test',
  submitButtonLabel: 'Absenden',
  confirmationType: 'message',
  _localized_status: { published: true },
  sections: [
    section('Anmeldeart', 'anmeldeart'),
    section('Rolle', 'jobhauptlager', { field: 'anmeldeart', value: 'rolle' }),
    section('Zeitfenster', 'zeitfenster', { field: 'anmeldeart', value: 'zeitfenster' }),
    section('Persönliches', 'vorname'),
  ],
} as unknown as ExtendedFormType;

const choose = (value: string): void => {
  fireEvent.change(screen.getByLabelText('anmeldeart'), { target: { value } });
};

describe('section display conditions', () => {
  beforeEach(() => {
    submitSpy.mockClear();
    sessionStorage.clear();
  });

  it('counts only the steps the current answer leads through', async () => {
    render(<FormBlock form={config} />);

    // Neither branch is chosen yet, so only the two unconditional steps count.
    expect(screen.getByText('Schritt 1 von 2')).toBeInTheDocument();

    choose('zeitfenster');
    expect(await screen.findByText('Schritt 1 von 3')).toBeInTheDocument();
  });

  it('skips the role step when the helper signs up for a time slot', async () => {
    render(<FormBlock form={config} />);

    choose('zeitfenster');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(await screen.findByLabelText('zeitfenster')).toBeInTheDocument();
    expect(screen.queryByLabelText('jobhauptlager')).not.toBeInTheDocument();
  });

  it('skips the time slot step when the helper signs up for a role', async () => {
    render(<FormBlock form={config} />);

    choose('rolle');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(await screen.findByLabelText('jobhauptlager')).toBeInTheDocument();
    expect(screen.queryByLabelText('zeitfenster')).not.toBeInTheDocument();
  });

  it('drops the answers of a branch the helper left', async () => {
    render(<FormBlock form={config} />);

    // Start down the role branch and answer its question …
    choose('rolle');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.change(await screen.findByLabelText('jobhauptlager'), {
      target: { value: 'Kuechenhilfe' },
    });

    // … then switch to the slot branch and finish there.
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    choose('zeitfenster');
    fireEvent.click(await screen.findByRole('button', { name: 'Weiter' }));
    fireEvent.change(await screen.findByLabelText('zeitfenster'), {
      target: { value: '2027-07-28 – 2027-07-30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Absenden' }));

    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    const [submitted] = submitSpy.mock.calls.at(0) as [Record<string, unknown>];
    expect(submitted['zeitfenster']).toBe('2027-07-28 – 2027-07-30');
    expect(submitted['jobhauptlager']).toBeUndefined();
  });

  /*
   * A helper sent through the Cevi DB login comes back with the stored step, but the stored
   * answers can leave fewer steps than there were — an index past the end would render an
   * empty form with no way forward.
   */
  it('falls back to the last remaining step when the restored index points past the end', async () => {
    sessionStorage.setItem(getFormStorageKey('test-form', 'step'), '2');

    render(<FormBlock form={config} />);

    // No branch chosen, so only the two unconditional steps remain.
    expect(await screen.findByText('Schritt 2 von 2')).toBeInTheDocument();
    expect(screen.getByLabelText('vorname')).toBeInTheDocument();
  });
});
