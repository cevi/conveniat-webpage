'use client';

import {
  replaceUniqueInLexical,
  replaceUniqueInText,
  type ProofreadFinding,
  type ProofreadResponse,
} from '@/features/payload-cms/payload-cms/utils/proofread';
import type { Config } from '@/features/payload-cms/payload-types';
import { useConfig, useDocumentInfo, useForm } from '@payloadcms/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ProofreadState =
  | { kind: 'loading' }
  /** The deployment has no Gemini key, so the dialog shows nothing. */
  | { kind: 'off' }
  | { kind: 'failed' }
  /** The editor chose to publish without waiting for the check. */
  | { kind: 'skipped' }
  | { kind: 'done'; findings: ProofreadFinding[]; truncated: boolean };

export interface Proofread {
  state: ProofreadState;
  /** The findings the editor has not applied or dismissed yet. */
  openFindings: ProofreadFinding[];
  /**
   * Writes the suggestion into the form. Returns false when the text changed meanwhile and
   * the place is no longer unique, so the editor has to fix it in the field.
   */
  apply: (finding: ProofreadFinding) => boolean;
  dismiss: (finding: ProofreadFinding) => void;
  /** Cancels a running check, so the editor can publish without it. */
  skip: () => void;
}

/**
 * Proofreads the unsaved form state of `locale` with Gemini once, when the component using it
 * mounts. The publish dialog mounts it on every opening, and closing the dialog cancels a check
 * still running.
 */
export const useProofread = (
  locale: Config['locale'],
  /** Told while the check runs, so the dialog can hold its confirm button back meanwhile. */
  onCheckingChange: (checking: boolean) => void,
): Proofread => {
  const { collectionSlug, globalSlug } = useDocumentInfo();
  const { config } = useConfig();
  const { getData, getDataByPath, dispatchFields, setModified } = useForm();
  const [state, setState] = useState<ProofreadState>({ kind: 'loading' });
  const [handled, setHandled] = useState<ReadonlySet<string>>(new Set());
  const runningCheck = useRef<AbortController | undefined>(undefined);

  const url = `${config.serverURL}${config.routes.api}/proofread`;

  useEffect(() => {
    const controller = new AbortController();
    runningCheck.current = controller;
    const run = async (): Promise<void> => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: collectionSlug,
            global: globalSlug,
            locale,
            data: getData(),
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          setState({ kind: 'failed' });
          return;
        }
        const result = (await response.json()) as ProofreadResponse;
        setState(
          result.status === 'disabled'
            ? { kind: 'off' }
            : {
                kind: 'done',
                findings: Array.isArray(result.findings) ? result.findings : [],
                truncated: result.truncated === true,
              },
        );
      } catch {
        if (!controller.signal.aborted) setState({ kind: 'failed' });
      }
    };
    void run();
    return (): void => controller.abort();
  }, [collectionSlug, getData, globalSlug, locale, url]);

  const checking = state.kind === 'loading';
  useEffect(() => {
    onCheckingChange(checking);
  }, [checking, onCheckingChange]);
  // the dialog closing unmounts the check, which must not leave its confirm button held back
  useEffect(() => (): void => onCheckingChange(false), [onCheckingChange]);

  const skip = useCallback((): void => {
    runningCheck.current?.abort();
    setState({ kind: 'skipped' });
  }, []);

  const markHandled = useCallback((finding: ProofreadFinding): void => {
    setHandled((previous) => new Set(previous).add(finding.id));
  }, []);

  const apply = useCallback(
    (finding: ProofreadFinding): boolean => {
      const current = getDataByPath(finding.path);
      if (finding.fieldType === 'richText') {
        const next = replaceUniqueInLexical(current, finding.original, finding.suggestion);
        if (next === undefined) return false;
        // the rich text editor only picks up a value from outside when its initial value
        // changes as well
        dispatchFields({ type: 'UPDATE', path: finding.path, value: next, initialValue: next });
      } else {
        const next =
          typeof current === 'string'
            ? replaceUniqueInText(current, finding.original, finding.suggestion)
            : undefined;
        if (next === undefined) return false;
        dispatchFields({ type: 'UPDATE', path: finding.path, value: next });
      }
      setModified(true);
      markHandled(finding);
      return true;
    },
    [dispatchFields, getDataByPath, markHandled, setModified],
  );

  const openFindings =
    state.kind === 'done' ? state.findings.filter((finding) => !handled.has(finding.id)) : [];

  return { state, openFindings, apply, dismiss: markHandled, skip };
};
