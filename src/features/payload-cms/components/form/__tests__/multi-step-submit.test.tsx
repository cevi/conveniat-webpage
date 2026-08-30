/**
 * @jest-environment jsdom
 */

import { FormBlock } from '@/features/payload-cms/components/form';
import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const submitSpy = jest.fn();

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

jest.mock('@/providers/posthog-context', () => ({
  usePostHog: (): undefined => undefined,
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'http://localhost:3000' },
}));

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
 * cannot load. This bug lives in the step/submit wiring, not in field rendering, so a plain
 * registered <input> per field is enough to exercise validation and navigation.
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
      section: { fields: { name: string; label: string; required?: boolean }[] };
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
            react.createElement('input', {
              id: f.name,
              ...register(f.name, { required: f.required === true }),
            }),
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

const lexical = {
  root: { type: 'root', children: [], direction: undefined, format: '', indent: 0, version: 1 },
};

const config = {
  id: 'test-form',
  title: 'Test',
  submitButtonLabel: 'Absenden',
  confirmationType: 'message',
  confirmationMessage: lexical,
  _localized_status: { published: true },
  sections: [
    {
      formSection: {
        sectionTitle: 'Schritt 1',
        layout: 'standard',
        fields: [{ blockType: 'text', name: 'feld1', label: 'Feld 1', required: true }],
      },
    },
    {
      formSection: {
        sectionTitle: 'Schritt 2',
        layout: 'standard',
        fields: [{ blockType: 'text', name: 'feld2', label: 'Feld 2', required: true }],
      },
    },
  ],
} as unknown as ExtendedFormType;

const type = (label: RegExp, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe('multi-step form navigation', () => {
  beforeEach(() => {
    submitSpy.mockClear();
    sessionStorage.clear();
  });

  it('submits only when the submit button is clicked', async () => {
    render(<FormBlock form={config} />);

    type(/Feld 1/, 'a');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    await screen.findByRole('button', { name: 'Absenden' });
    type(/Feld 2/, 'b');

    expect(submitSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Absenden' }));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
  });

  it('does not submit when stepping forward onto the last step again', async () => {
    render(<FormBlock form={config} />);

    // fill the whole form, reaching the last step once
    type(/Feld 1/, 'a');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    await screen.findByRole('button', { name: 'Absenden' });
    type(/Feld 2/, 'b');

    // navigate back, then forward again -- without ever clicking "Absenden"
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    await screen.findByRole('button', { name: 'Weiter' });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    await screen.findByRole('button', { name: 'Absenden' });

    await waitFor(() => expect(submitSpy).not.toHaveBeenCalled());
  });

  /*
   * jsdom runs a button's activation behaviour synchronously inside dispatchEvent, so it cannot
   * observe the real-browser race this guards against. What it *can* pin down is the property
   * the fix relies on: the forward button and the submit button must never be the same DOM node,
   * because patching `type` on a live node mid-click is what makes the browser submit.
   */
  it('mounts a separate DOM node for the submit button instead of retyping the next button', async () => {
    render(<FormBlock form={config} />);

    const nextButton = screen.getByRole('button', { name: 'Weiter' });
    expect(nextButton).toHaveAttribute('type', 'button');

    type(/Feld 1/, 'a');
    fireEvent.click(nextButton);

    const submitButton = await screen.findByRole('button', { name: 'Absenden' });
    expect(submitButton).toHaveAttribute('type', 'submit');
    expect(submitButton).not.toBe(nextButton);
    expect(nextButton).not.toHaveAttribute('type', 'submit');
  });
});
