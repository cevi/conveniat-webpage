/**
 * @jest-environment jsdom
 */

import { Select } from '@/features/payload-cms/components/form/select';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { FieldValues, UseFormRegister } from 'react-hook-form';
import { useForm } from 'react-hook-form';

let mockLocale = 'de';
jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => mockLocale,
}));

const Harness: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const { control, register } = useForm<FieldValues>({ defaultValues: { essen: '' } });
  return (
    <Select
      blockType="select"
      name="essen"
      label="Essgewohnheiten"
      control={control}
      registerAction={register as unknown as UseFormRegister<string & FieldValues>}
      optionType="dropdown"
      allowMultiple={false}
      options={[{ label: 'Vegi', value: 'vegi' }]}
      {...(placeholder === undefined ? {} : { placeholder })}
    />
  );
};

describe('Select placeholder', () => {
  it('asks in the reader’s language when the editor gave the dropdown no placeholder', () => {
    mockLocale = 'fr';
    render(<Harness placeholder="" />);

    expect(screen.getByText('Veuillez choisir …')).toBeTruthy();
    expect(screen.queryByText('Select...')).toBeNull();
  });

  it('keeps the placeholder the editor wrote', () => {
    mockLocale = 'de';
    render(<Harness placeholder="Bitte Essgewohnheit wählen" />);

    expect(screen.getByText('Bitte Essgewohnheit wählen')).toBeTruthy();
  });
});
