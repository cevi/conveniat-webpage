import { fitPushText } from '@/utils/push-notifications/fit-push-text';

const payloadBytes = (text: string): number =>
  new TextEncoder().encode(JSON.stringify(text)).length - 2;

describe('fitPushText', () => {
  it('leaves a text within the budget untouched', () => {
    expect(fitPushText('Znacht um 19:30 im Hof Cevi Uster.', 100)).toBe(
      'Znacht um 19:30 im Hof Cevi Uster.',
    );
  });

  it('cuts a long announcement to the budget and marks the cut', () => {
    const announcement = 'Liebe Leitende, das Gesamtlager startet morgen um 9 Uhr. '.repeat(40);

    const fitted = fitPushText(announcement, 200);

    expect(payloadBytes(fitted)).toBeLessThanOrEqual(200);
    expect(fitted.endsWith('…')).toBe(true);
    expect(announcement.startsWith(fitted.slice(0, -1))).toBe(true);
  });

  // A newline or a quote takes two bytes in the JSON payload, an umlaut two and an emoji four,
  // so counting characters would overshoot the service's limit for exactly these texts.
  it('counts the bytes the text takes up in the payload, not its characters', () => {
    const fitted = fitPushText('"Grüezi" 😀\n'.repeat(100), 100);

    expect(payloadBytes(fitted)).toBeLessThanOrEqual(100);
  });

  it('never splits an emoji or an accented letter', () => {
    const family = '👨‍👩‍👧';
    const accented = 'é';
    const fitted = fitPushText(`${family}${accented}`.repeat(50), 40);

    const graphemes = [...new Intl.Segmenter().segment(fitted.slice(0, -1))].map(
      ({ segment }) => segment,
    );
    for (const grapheme of graphemes) {
      expect([family, accented]).toContain(grapheme);
    }
  });
});
