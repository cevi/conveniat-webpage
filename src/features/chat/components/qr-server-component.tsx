import { APP_USER_AGENT, QR_CODE_BACKEND_URL } from '@/config/constants';
import { environmentVariables } from '@/config/environment-variables';
import { QRCodeClientComponent } from '@/features/chat/components/qr-component';
import { QrCode } from 'lucide-react';
import type React from 'react';

export const QrCodeIconSkeleton: React.FC = () => (
  <div className="flex h-10 w-10 items-center justify-center">
    <QrCode className="h-6 w-6 animate-pulse text-gray-400" />
  </div>
);

export const QRCodeServerComponent: React.FC<{ userId: string }> = async ({ userId }) => {
  let qrCodeSvg: string | undefined;
  try {
    const inviteUrl = `${
      environmentVariables.NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS
        ? 'https://con27.ch'
        : environmentVariables.NEXT_PUBLIC_APP_HOST_URL
    }/app/chat/new-chat-with-user/${userId}`;
    const response = await fetch(`${QR_CODE_BACKEND_URL}/svg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': APP_USER_AGENT,
      },
      body: JSON.stringify({
        text: inviteUrl,
        options: { color_scheme: 'cevi' },
      }),
      next: { revalidate: 86_400 }, // Cache server-side for 24 hours
    });
    if (response.ok) {
      const rawSvg = await response.text();
      const processed = rawSvg
        .replace(/b(['"])([\s\S]*?)\1/, (_, _q: string, p1: string) => {
          return p1
            .replaceAll(String.raw`\n`, '\n')
            .replaceAll(String.raw`\'`, "'")
            .replaceAll(String.raw`\"`, '"');
        })
        .replaceAll('ns0:', '');
      if (processed.includes('<svg')) {
        qrCodeSvg = processed;
      }
    }
  } catch (error) {
    console.error('Error pre-rendering QR code SVG server-side:', error);
  }

  return <QRCodeClientComponent url={userId} initialSvg={qrCodeSvg} />;
};
