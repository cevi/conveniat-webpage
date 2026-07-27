import { extractStringKey } from '@/features/payload-cms/payload-cms/utils/extract-string-key';

describe('extractStringKey', () => {
  it('returns trimmed string for plain string input', () => {
    expect(extractStringKey('  M2  ')).toBe('M2');
  });

  it('returns undefined for empty or whitespace string', () => {
    expect(extractStringKey('')).toBeUndefined();
    expect(extractStringKey('   ')).toBeUndefined();
  });

  it('returns localized property matching requested locale', () => {
    expect(extractStringKey({ de: 'M2', en: 'M2_EN' }, 'de')).toBe('M2');
    expect(extractStringKey({ de: 'M2', en: 'M2_EN' }, 'en')).toBe('M2_EN');
  });

  it('falls back to key or value property if locale not present', () => {
    expect(extractStringKey({ key: '  S2 ' })).toBe('S2');
    expect(extractStringKey({ value: ' F2 ' })).toBe('F2');
  });

  it('falls back to any first non-empty string in object if specific keys not present', () => {
    expect(extractStringKey({ customProp: '  M2 ' })).toBe('M2');
  });

  it('returns undefined for non-objects or empty objects', () => {
    expect(extractStringKey(123)).toBeUndefined();
    expect(extractStringKey({})).toBeUndefined();
  });
});
