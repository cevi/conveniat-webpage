'use client';

import { labels } from '@/features/material/components/material-labels';
import { inputClass, MaterialButton, Panel } from '@/features/material/components/material-ui';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { useQrScanner } from '@/features/material/hooks/use-qr-scanner';
import { resolveScan } from '@/features/material/utils/scan';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ScanLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

const text = {
  aim: {
    de: 'Halte die Kamera auf das QR-Etikett.',
    en: 'Point the camera at the QR label.',
    fr: 'Vise l’étiquette QR avec la caméra.',
  },
  unsupported: {
    de: 'Dieser Browser kann keine QR-Codes lesen. Scanne das Etikett mit der Kamera-App oder gib den Code ein.',
    en: 'This browser cannot read QR codes. Scan the label with the camera app or type the code.',
    fr: 'Ce navigateur ne lit pas les codes QR. Scanne l’étiquette avec l’app caméra ou saisis le code.',
  },
  denied: {
    de: 'Kein Zugriff auf die Kamera. Gib den Code von Hand ein.',
    en: 'No camera access. Type the code instead.',
    fr: 'Pas d’accès à la caméra. Saisis le code à la main.',
  },
  manual: {
    de: 'Artikelcode oder Ausleihnummer',
    en: 'Item code or loan number',
    fr: 'Code article ou numéro de prêt',
  },
  open: { de: 'Öffnen', en: 'Open', fr: 'Ouvrir' },
  unknown: {
    de: 'Dieser Code gehört nicht zum Materialdepot.',
    en: 'This code does not belong to the material depot.',
    fr: 'Ce code n’appartient pas au dépôt de matériel.',
  },
} satisfies Record<string, StaticTranslationString>;

export const ScanView: React.FC = () => {
  const locale = useMaterialLocale();
  const router = useRouter();
  const [manual, setManual] = useState('');

  // answers whether the code led somewhere, so the camera keeps looking after a foreign one
  const open = useCallback(
    (value: string): boolean => {
      const target = resolveScan(value, globalThis.location.origin);
      if (target === undefined) {
        toast.error(text.unknown[locale]);
        return false;
      }
      router.push(target);
      return true;
    },
    [router, locale],
  );
  const { state, videoReference } = useQrScanner(open);

  return (
    <div className="mx-auto max-w-md space-y-4">
      {state !== 'unsupported' && state !== 'denied' && (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoReference}
            className="aspect-square w-full object-cover"
            muted
            playsInline
          />
          <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" />
          <p className="absolute right-0 bottom-3 left-0 text-center text-sm font-semibold text-white">
            {state === 'starting' ? labels.loading[locale] : text.aim[locale]}
          </p>
        </div>
      )}
      {(state === 'unsupported' || state === 'denied') && (
        <Panel>
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-gray-600">
            <ScanLine className="size-10 text-gray-300" aria-hidden />
            {state === 'denied' ? text.denied[locale] : text.unsupported[locale]}
          </div>
        </Panel>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          open(manual);
        }}
      >
        <input
          className={cn(inputClass, 'font-mono uppercase')}
          placeholder={text.manual[locale]}
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          autoCapitalize="characters"
        />
        <MaterialButton type="submit" disabled={manual.trim() === ''}>
          {text.open[locale]}
        </MaterialButton>
      </form>
    </div>
  );
};
