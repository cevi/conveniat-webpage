/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

const setValue = jest.fn();

jest.mock('@payloadcms/ui', () => ({
  useField: (): { value: boolean; setValue: jest.Mock } => ({ value: false, setValue }),
  useLocale: (): { code: string } => ({ code: 'de' }),
}));

// eslint-disable-next-line import/first -- must be imported after the @payloadcms/ui mock
import { FeatureFlagToggle } from '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle';

type ToggleProperties = React.ComponentProps<typeof FeatureFlagToggle>;

const renderToggle = (field: Record<string, unknown>, label?: unknown): void => {
  render(
    <FeatureFlagToggle {...({ path: 'someFlag', label, field } as unknown as ToggleProperties)} />,
  );
};

describe('FeatureFlagToggle', () => {
  it('renders a localized description for the active locale instead of crashing', (): void => {
    renderToggle({
      name: 'hideFullHelperShifts',
      label: { en: 'Hide Full Helper Slots', de: 'Volle Schichteinsätze ausblenden', fr: '…' },
      admin: {
        description: {
          en: 'Toggles hiding full helper slots.',
          de: 'Blendet voll ausgebuchte Schichteinsätze aus.',
          fr: 'Masque les services complets.',
        },
      },
    });

    expect(screen.getByText('Volle Schichteinsätze ausblenden')).toBeInTheDocument();
    expect(screen.getByText('Blendet voll ausgebuchte Schichteinsätze aus.')).toBeInTheDocument();
  });

  it('renders plain string labels and descriptions unchanged', (): void => {
    renderToggle({
      name: 'imageUploadEnabled',
      label: 'Show Image Upload',
      admin: { description: 'Toggles visibility of the Image Upload menu item in the app.' },
    });

    expect(screen.getByText('Show Image Upload')).toBeInTheDocument();
    expect(
      screen.getByText('Toggles visibility of the Image Upload menu item in the app.'),
    ).toBeInTheDocument();
  });

  it('falls back to English when the active locale is missing from the record', (): void => {
    renderToggle({
      name: 'forumEnabled',
      label: { en: 'Show Forum' },
      admin: { description: { en: 'English only.' } },
    });

    expect(screen.getByText('Show Forum')).toBeInTheDocument();
    expect(screen.getByText('English only.')).toBeInTheDocument();
  });

  it('skips descriptions that are not renderable text', (): void => {
    renderToggle({
      name: 'someFlag',
      label: 'Some Flag',
      admin: { description: (): string => 'from a function' },
    });

    expect(screen.getByText('Some Flag')).toBeInTheDocument();
    expect(screen.queryByText('from a function')).not.toBeInTheDocument();
  });

  it('falls back to the field name when no label is provided', (): void => {
    renderToggle({ name: 'unlabelledFlag', admin: {} });

    expect(screen.getByText('unlabelledFlag')).toBeInTheDocument();
  });
});
