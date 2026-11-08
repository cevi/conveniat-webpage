/**
 * @jest-environment jsdom
 */

import type { LinkPreset } from '@/features/payload-cms/components/form/hooks/use-answers-from-link';
import { useLinkPreset } from '@/features/payload-cms/components/form/hooks/use-answers-from-link';
import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import { act, renderHook } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';

const config = {
  id: 'helfer',
  sections: [
    {
      formSection: {
        fields: [
          {
            blockType: 'select',
            name: 'anmeldeart',
            options: [{ value: 'rolle' }, { value: 'zeitfenster' }],
          },
          { blockType: 'text', name: 'vorname' },
          {
            blockType: 'conditionedBlock',
            fields: [{ blockType: 'select', name: 'hauptlager', options: [{ value: 'yes' }] }],
          },
        ],
      },
    },
  ],
} as unknown as ExtendedFormType;

const openLink = (
  search: string,
  enabled = true,
): ReturnType<typeof renderHook<{ formMethods: UseFormReturn; preset: LinkPreset }, unknown>> => {
  globalThis.history.replaceState(undefined, '', `/helfenden-anmeldung${search}`);
  return renderHook(() => {
    const formMethods = useForm();
    return { formMethods, preset: useLinkPreset(config, formMethods, enabled) };
  });
};

describe('useLinkPreset', () => {
  it('answers and hides the choices a link names, and filters the jobs', () => {
    const { result } = openLink('?anmeldeart=rolle&hauptlager=yes&job-bereich=sicherheit');

    expect(result.current.formMethods.getValues()).toEqual({
      anmeldeart: 'rolle',
      hauptlager: 'yes',
    });
    expect(result.current.preset.answers).toEqual({ anmeldeart: 'rolle', hauptlager: 'yes' });
    expect([...result.current.preset.jobArea]).toEqual(['sicherheit']);
    expect(result.current.preset.isActive).toBe(true);
  });

  it('ignores values that are no option, fields that are no choice and unknown Ressorts', () => {
    const { result } = openLink('?anmeldeart=chef&vorname=Hans&job-bereich=sanitaet');

    expect(result.current.formMethods.getValues()).toEqual({});
    expect(result.current.preset.isActive).toBe(false);
  });

  it('gives the whole form back, keeping the answers, and drops the link from the address', () => {
    const { result } = openLink('?anmeldeart=rolle&job-bereich=sicherheit&utm=flyer');

    act(() => result.current.preset.showAll());

    expect(result.current.preset.answers).toEqual({});
    expect(result.current.preset.jobArea.size).toBe(0);
    expect(result.current.formMethods.getValues()).toEqual({ anmeldeart: 'rolle' });
    expect(globalThis.location.search).toBe('?utm=flyer');
  });

  it('leaves an embedded form alone', () => {
    const { result } = openLink('?anmeldeart=rolle', false);

    expect(result.current.formMethods.getValues()).toEqual({});
    expect(result.current.preset.isActive).toBe(false);
  });
});
