'use client';

import { APP_USER_AGENT, QR_CODE_BACKEND_URL } from '@/config/constants';
import { environmentVariables } from '@/config/environment-variables';
import { MaterialButton } from '@/features/material/components/material-ui';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { QRCodeImage } from '@/features/payload-cms/payload-cms/components/qr-code/qr-code-image';
import type { StaticTranslationString } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const text = {
  print: { de: 'Etikett drucken', en: 'Print label', fr: 'Imprimer l’étiquette' },
} satisfies Record<string, StaticTranslationString>;

/** The absolute link a label points to, so any phone camera opens it without the app. */
export const materialQrUrl = (path: string): string =>
  `${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}${path}`;

/**
 * The QR label of an article or a loan, drawn by the Cevi QR service in the Cevi colours.
 * Only fetched while shown, and never persisted: a label is printed once, not read offline.
 */
export const MaterialQrCode: React.FC<{ path: string; caption: string }> = ({ path, caption }) => {
  const locale = useMaterialLocale();
  const url = materialQrUrl(path);
  const [copied, setCopied] = useState(false);

  const svg = useQuery({
    queryKey: ['materialQrCode', url],
    meta: { persist: false },
    staleTime: Infinity,
    queryFn: async () => {
      const response = await fetch(`${QR_CODE_BACKEND_URL}/svg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': APP_USER_AGENT },
        body: JSON.stringify({ text: url, options: { color_scheme: 'cevi' } }),
      });
      if (!response.ok) throw new Error(`QR code fetch failed: ${response.status}`);
      // the service answers with a Python bytes literal around the markup
      const markup = await response.text();
      return markup
        .replaceAll(/b(['"])([\s\S]*?)\1/g, (_, _quote: string, body: string) =>
          body
            .replaceAll(String.raw`\n`, '\n')
            .replaceAll(String.raw`\'`, "'")
            .replaceAll(String.raw`\"`, '"'),
        )
        .replaceAll('ns0:', '');
    },
  });

  const printLabel = (): void => {
    const sheet = window.open('', '_blank', 'width=400,height=500');
    if (!sheet || svg.data === undefined) return;
    sheet.document.title = caption;
    const figure = sheet.document.createElement('figure');
    figure.style.cssText = 'margin:0;text-align:center;font-family:sans-serif';
    const holder = sheet.document.createElement('div');
    holder.style.cssText = 'width:240px;margin:auto';
    // an SVG loaded as an image runs neither scripts nor event handlers, whatever the
    // QR service answered, so the label needs no sanitising on its way to the printer
    const image = sheet.document.createElement('img');
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.data)}`;
    image.alt = caption;
    image.style.cssText = 'width:100%';
    holder.append(image);
    const label = sheet.document.createElement('figcaption');
    label.textContent = caption;
    label.style.cssText = 'font-weight:bold;font-size:18px;margin-top:8px';
    figure.append(holder, label);
    sheet.document.body.append(figure);
    image.addEventListener('load', () => sheet.print(), { once: true });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeImage
        qrImageSrc={svg.data}
        fullURL={url}
        copied={copied}
        handleCopy={() => {
          void navigator.clipboard.writeText(url).then(() => setCopied(true));
        }}
        isLoading={svg.isLoading}
        isError={svg.isError}
        locale={locale}
      />
      <MaterialButton variant="secondary" onClick={printLabel} disabled={svg.data === undefined}>
        <Printer aria-hidden />
        {text.print[locale]}
      </MaterialButton>
    </div>
  );
};
