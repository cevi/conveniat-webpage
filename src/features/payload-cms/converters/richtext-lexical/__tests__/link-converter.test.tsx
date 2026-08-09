jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch',
  },
}));

import { getLinkJSXConverter } from '@/features/payload-cms/converters/richtext-lexical/link-converter';
import type React from 'react';

interface LinkConverterArguments {
  node: { fields: Record<string, unknown>; children: unknown[] };
  nodesToJSX: () => React.ReactNode[];
}

const renderLink = (fields: Record<string, unknown>): React.ReactElement => {
  const { link } = getLinkJSXConverter('de');
  if (typeof link !== 'function') throw new Error('the link converter is not registered');

  const convert = link as unknown as (arguments_: LinkConverterArguments) => React.ReactElement;
  return convert({
    node: { fields, children: [] },
    nodesToJSX: () => ['Ruf uns an'],
  });
};

const propertiesOf = (element: React.ReactElement): { href?: string; children?: unknown } =>
  element.props as { href?: string; children?: unknown };

describe('link converter', () => {
  it('renders a phone link as a tel: anchor', () => {
    const element = renderLink({ linkType: 'phone', phoneNumber: '+41 79 316 83 49' });
    expect(propertiesOf(element).href).toBe('tel:+41793168349');
  });

  it('renders phone links without a dialable number as plain text', () => {
    const element = renderLink({ linkType: 'phone', phoneNumber: '' });
    expect(propertiesOf(element).href).toBeUndefined();
    expect(propertiesOf(element).children).toEqual(['Ruf uns an']);
  });

  it('still renders custom links as regular links', () => {
    const element = renderLink({ linkType: 'custom', url: 'https://cevi.ch' });
    expect(propertiesOf(element).href).toBe('https://cevi.ch');
  });
});
