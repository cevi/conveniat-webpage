import { phoneNumberToTelHref } from '@/features/payload-cms/utils/phone-number';

describe('phoneNumberToTelHref', () => {
  it('strips formatting from international numbers', () => {
    expect(phoneNumberToTelHref('+41 79 316 83 49')).toBe('tel:+41793168349');
    expect(phoneNumberToTelHref('+41-79-316-83-49')).toBe('tel:+41793168349');
    expect(phoneNumberToTelHref('  +41 79 316 83 49  ')).toBe('tel:+41793168349');
  });

  it('normalizes the 00 country prefix and the (0) trunk prefix', () => {
    expect(phoneNumberToTelHref('0041 79 316 83 49')).toBe('tel:+41793168349');
    expect(phoneNumberToTelHref('+41 (0)79 316 83 49')).toBe('tel:+41793168349');
    expect(phoneNumberToTelHref('+41(0)79 316 83 49')).toBe('tel:+41793168349');
  });

  it('keeps domestic numbers as dialed', () => {
    expect(phoneNumberToTelHref('079 316 83 49')).toBe('tel:0793168349');
    expect(phoneNumberToTelHref('044.123.45.67')).toBe('tel:0441234567');
  });

  it('accepts an already prefixed tel: value', () => {
    expect(phoneNumberToTelHref('tel:+41 79 316 83 49')).toBe('tel:+41793168349');
  });

  it('returns an empty string if there is nothing to dial', () => {
    expect(phoneNumberToTelHref('')).toBe('');
    expect(phoneNumberToTelHref('   ')).toBe('');
    expect(phoneNumberToTelHref('no digits here')).toBe('');
  });
});
