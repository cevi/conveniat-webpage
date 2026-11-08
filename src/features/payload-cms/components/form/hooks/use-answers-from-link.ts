import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import { RESSORT_OPTIONS } from '@/features/payload-cms/constants/ressort-options';
import { getFormBlocks } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Preselects the Ressort filter of every job selection. A field name only holds `[a-z0-9_]`,
 * so this parameter can never be mistaken for an answer.
 */
export const JOB_AREA_PARAMETER = 'job-bereich';

const ressortValues = new Set<string>(RESSORT_OPTIONS.map((option) => option.value));

interface ChoiceBlock {
  name: string;
  allowMultiple?: unknown;
  options?: { value?: unknown }[];
}

/** Every choice of the form by its name, those inside conditioned blocks too. */
const getChoiceBlocks = (config: ExtendedFormType): Map<string, ChoiceBlock> =>
  new Map(
    config.sections
      .flatMap((section) => getFormBlocks(section.formSection.fields, 'select'))
      .map((block) => [block['name'] as string, block as unknown as ChoiceBlock]),
  );

const unsubscribe = (): void => {};
const subscribeToNothing = (): (() => void) => unsubscribe;
const readSearch = (): string => globalThis.location.search;
const readNoSearch = (): string => '';

export interface LinkPreset {
  /** The answers the link gives, by field name; the form hides those questions. */
  answers: Readonly<Record<string, string | string[]>>;
  /** The Ressort the job selections start filtered on. */
  jobArea: ReadonlySet<string>;
  /** Whether the link narrows the form at all, so the helper can be offered the whole form. */
  isActive: boolean;
  /** Shows the whole form again: the questions return with their answers, the filter goes. */
  showAll: () => void;
}

/**
 * A link that leads straight into one branch of a form, such as a flyer for the Sanität:
 * `?anmeldeart=rolle&aufbaulager=no&hauptlager=yes&abbaulager=no&job-bereich=sicherheit`.
 *
 * Only choices take part, and only with a value among their options, so a link cannot write
 * text into the answers. The form fills them in and hides their questions, which skips every
 * step left with nothing to ask. `job-bereich` preselects the Ressort filter of the job
 * selections. `showAll` gives the helper the whole form back.
 *
 * Call it after the answers stored in the session are restored, so the link wins on a
 * reload too. An embedded form is left alone: its embedding feature sets the answers.
 */
export const useLinkPreset = (
  config: ExtendedFormType,
  formMethods: UseFormReturn<FieldValues>,
  enabled: boolean,
): LinkPreset => {
  const search = useSyncExternalStore(subscribeToNothing, readSearch, readNoSearch);
  const [isDismissed, setIsDismissed] = useState(false);
  const { setValue } = formMethods;

  const parsed = useMemo(() => {
    const answers: Record<string, string | string[]> = {};
    const parameters = new URLSearchParams(search);
    const choices = getChoiceBlocks(config);
    for (const [name, value] of parameters) {
      const choice = choices.get(name);
      const isOption = choice?.options?.some((option) => option.value === value) === true;
      if (isOption) answers[name] = choice.allowMultiple === true ? [value] : value;
    }
    const area = parameters.get(JOB_AREA_PARAMETER) ?? '';
    return { answers, jobArea: new Set(ressortValues.has(area) ? [area] : []) };
  }, [search, config]);

  const isApplied = enabled && !isDismissed;

  useEffect(() => {
    if (!isApplied) return;
    for (const [name, value] of Object.entries(parsed.answers)) setValue(name, value);
  }, [isApplied, parsed, setValue]);

  const showAll = useCallback((): void => {
    setIsDismissed(true);
    // a reload then shows the whole form as well, with the answers kept in the session
    const url = new URL(globalThis.location.href);
    for (const name of [...Object.keys(parsed.answers), JOB_AREA_PARAMETER]) {
      url.searchParams.delete(name);
    }
    globalThis.history.replaceState(undefined, '', url.pathname + url.search + url.hash);
  }, [parsed]);

  return useMemo(
    () =>
      isApplied
        ? {
            ...parsed,
            isActive: Object.keys(parsed.answers).length > 0 || parsed.jobArea.size > 0,
            showAll,
          }
        : { answers: {}, jobArea: new Set<string>(), isActive: false, showAll },
    [isApplied, parsed, showAll],
  );
};
