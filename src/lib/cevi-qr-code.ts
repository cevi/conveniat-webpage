import { APP_USER_AGENT, QR_CODE_BACKEND_URL } from '@/config/constants';

/**
 * Renders `text` as a QR code in the Cevi colours through the Cevi QR code backend and returns
 * the SVG markup. The service wraps the markup in a Python bytes literal, which is unwrapped here.
 */
export const fetchCeviQrCodeSvg = async (text: string): Promise<string> => {
  const response = await fetch(`${QR_CODE_BACKEND_URL}/svg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': APP_USER_AGENT,
    },
    body: JSON.stringify({ text, options: { color_scheme: 'cevi' } }),
  });
  if (!response.ok) {
    throw new Error(`QR code fetch failed: ${response.status}`);
  }
  const rawSvg = await response.text();
  return rawSvg
    .replaceAll(/b(['"])([\s\S]*?)\1/g, (_, _quote: string, body: string) =>
      body
        .replaceAll(String.raw`\n`, '\n')
        .replaceAll(String.raw`\'`, "'")
        .replaceAll(String.raw`\"`, '"'),
    )
    .replaceAll('ns0:', '');
};
