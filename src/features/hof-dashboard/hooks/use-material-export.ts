'use client';

import type { MaterialExportSheet } from '@/features/hof-dashboard/api/material-orders-export';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useState } from 'react';

/** The file name the server gave the download, from its `filename*` or its plain `filename`. */
const filenameOf = (disposition: string | null): string | undefined => {
  const encoded = /filename\*=UTF-8''([^;]+)/.exec(disposition ?? '')?.[1];
  if (encoded !== undefined) return decodeURIComponent(encoded);
  return /filename="([^"]+)"/.exec(disposition ?? '')?.[1];
};

/**
 * Downloads the material orders as an Excel workbook. Fetched rather than linked, so the
 * Ressort's view learns when the export is done and shows what changed after it.
 */
export const useMaterialExport = (
  locale: Locale,
): {
  download: (formIds: readonly string[], sheets: readonly MaterialExportSheet[]) => Promise<void>;
  pending: boolean;
} => {
  const utils = trpc.useUtils();
  const [pending, setPending] = useState(false);

  const download = async (
    formIds: readonly string[],
    sheets: readonly MaterialExportSheet[],
  ): Promise<void> => {
    const query = new URLSearchParams([
      ...formIds.map((id): [string, string] => ['form', id]),
      ...sheets.map((sheet): [string, string] => ['sheet', sheet]),
    ]);
    setPending(true);
    try {
      const response = await fetch(`/api/hof-dashboard/material-orders?${query.toString()}`);
      if (!response.ok) throw new Error(`Export answered ${response.status}`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download =
        filenameOf(response.headers.get('Content-Disposition')) ?? 'Materialbestellungen.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      notifyFailure(locale, 'exportFailed');
    } finally {
      setPending(false);
    }
    await utils.hofDashboard.getMaterialOrderList.invalidate();
  };
  return { download, pending };
};
