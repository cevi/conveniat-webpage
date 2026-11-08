import { isStepShown } from '@/features/payload-cms/components/form/hooks/use-form-steps';
import type { FormSection } from '@/features/payload-cms/components/form/types';

// the steps hook stores the step under a key that names the deployment
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'http://localhost:3000' },
}));

const hauptlager = {
  sectionTitle: 'Hauptlager',
  displayCondition: { field: 'anmeldeart', value: 'rolle' },
  fields: [
    { blockType: 'select', name: 'hauptlager' },
    {
      blockType: 'conditionedBlock',
      displayCondition: { field: 'hauptlager', value: 'yes' },
      fields: [{ blockType: 'jobSelection', name: 'jobhauptlager' }],
    },
  ],
} as unknown as FormSection;

const welcome = {
  sectionTitle: 'Willkommen',
  fields: [{ blockType: 'message' }],
} as unknown as FormSection;

const answers =
  (values: Record<string, string>) =>
  (name: string): string | undefined =>
    values[name];

describe('isStepShown', () => {
  const linkAnswers = new Set(['anmeldeart', 'hauptlager']);

  it('keeps a step that still asks something next to the answered question', () => {
    expect(
      isStepShown(hauptlager, linkAnswers, answers({ anmeldeart: 'rolle', hauptlager: 'yes' })),
    ).toBe(true);
  });

  it('skips a step whose only question a link answered', () => {
    expect(
      isStepShown(hauptlager, linkAnswers, answers({ anmeldeart: 'rolle', hauptlager: 'no' })),
    ).toBe(false);
  });

  it('shows the same step when nothing is answered for the helper', () => {
    expect(
      isStepShown(hauptlager, new Set(), answers({ anmeldeart: 'rolle', hauptlager: 'no' })),
    ).toBe(true);
  });

  it('still respects the display condition and keeps steps without questions', () => {
    expect(isStepShown(hauptlager, new Set(), answers({ anmeldeart: 'zeitfenster' }))).toBe(false);
    expect(isStepShown(welcome, linkAnswers, answers({}))).toBe(true);
  });
});
