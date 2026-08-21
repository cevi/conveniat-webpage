jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch',
  },
}));

import {
  formatMessageContent,
  formatPhoneToTel,
} from '@/features/chat/components/chat-view/message/utils/format-message-content';
import type React from 'react';

describe('formatMessageContent phone number parser', () => {
  describe('formatPhoneToTel utility', () => {
    it('formats domestic numbers correctly', () => {
      expect(formatPhoneToTel('079 123 45 67')).toBe('tel:0791234567');
      expect(formatPhoneToTel('079-123-45-67')).toBe('tel:0791234567');
      expect(formatPhoneToTel('044.123.45.67')).toBe('tel:0441234567');
    });

    it('formats international numbers correctly', () => {
      expect(formatPhoneToTel('+41 79 123 45 67')).toBe('tel:+41791234567');
      expect(formatPhoneToTel('+41 (0)79 123 45 67')).toBe('tel:+41791234567');
      expect(formatPhoneToTel('+41(0)79 123 45 67')).toBe('tel:+41791234567');
      expect(formatPhoneToTel('0041 79 123 45 67')).toBe('tel:+41791234567');
    });
  });

  describe('formatMessageContent rendering', () => {
    it('parses domestic Swiss phone numbers (079 xxx xx xx)', () => {
      const result = formatMessageContent('Call me at 079 123 45 67!', 'de');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('Call me at ');

      const linkElement = result[1] as React.ReactElement<{
        href: string;
        className: string;
        children: string;
      }>;
      expect(linkElement.props.href).toBe('tel:0791234567');
      expect(linkElement.props.className).toBe('underline');
      expect(linkElement.props.children).toBe('079 123 45 67');

      expect(result[2]).toBe('!');
    });

    it('parses international Swiss phone numbers (+41 xx xxx xx xx)', () => {
      const result = formatMessageContent('Reach out via +41 79 123 45 67', 'en');
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Reach out via ');

      const linkElement = result[1] as React.ReactElement<{
        href: string;
        className: string;
        children: string;
      }>;
      expect(linkElement.props.href).toBe('tel:+41791234567');
      expect(linkElement.props.children).toBe('+41 79 123 45 67');
    });

    it('parses international numbers with (0)', () => {
      const result = formatMessageContent('Number: +41 (0)79 123 45 67', 'de');
      const linkElement = result[1] as React.ReactElement<{
        href: string;
        children: string;
      }>;
      expect(linkElement.props.href).toBe('tel:+41791234567');
      expect(linkElement.props.children).toBe('+41 (0)79 123 45 67');
    });

    it('does not parse non-phone numbers like dates or IP addresses', () => {
      const text = 'Meeting on 2026-07-23 at 192.168.1.1 with 100 000 000';
      const result = formatMessageContent(text, 'de');
      expect(result).toEqual([text]);
    });

    it('does not parse list-item prefix followed by digits as phone number', () => {
      const text = 'Option 0. 79 123 45 67 is the extension';
      const result = formatMessageContent(text, 'de');
      expect(result).toEqual([text]);
    });
  });
});

const isLineBreak = (node: React.ReactNode): boolean =>
  typeof node === 'object' && node !== null && (node as React.ReactElement).type === 'br';

describe('formatMessageContent line breaks', () => {
  it('renders a newline as a line break element', () => {
    const result = formatMessageContent('Zeile 1\nZeile 2', 'de');

    expect(result[0]).toBe('Zeile 1');
    expect(isLineBreak(result[1])).toBe(true);
    expect(result[2]).toBe('Zeile 2');
  });

  it('renders a blank line as two line break elements', () => {
    const result = formatMessageContent('Oben\n\nUnten', 'de');

    expect(result.filter((node) => isLineBreak(node))).toHaveLength(2);
    expect(result.filter((node) => typeof node === 'string')).toEqual(['Oben', 'Unten']);
  });

  it('keeps the line breaks of a localized announcement payload', () => {
    const announcementPayload = {
      de: {
        title: 'Wetterwarnung',
        body: 'Zieht euch warm an.\nDas Zelt bleibt zu.',
        text: '*Wetterwarnung*\n\nZieht euch warm an.\nDas Zelt bleibt zu.',
      },
    };

    const result = formatMessageContent(announcementPayload, 'de');

    expect(result.filter((node) => isLineBreak(node))).toHaveLength(3);
    expect(result.filter((node) => typeof node === 'string')).toEqual([
      'Zieht euch warm an.',
      'Das Zelt bleibt zu.',
    ]);
  });
});
