import { formFileKey, isFormFileKey } from '@/lib/form-file-key';

describe('formFileKey', () => {
  it('keeps nothing of the name but its extension', () => {
    const key = formFileKey('Hofplan Züri 11.PDF');
    expect(key).toMatch(/^[\da-f-]{36}\.pdf$/);
    expect(isFormFileKey(key)).toBe(true);
  });

  it('gives every upload of the same name a key of its own', () => {
    expect(formFileKey('plan.pdf')).not.toBe(formFileKey('plan.pdf'));
  });

  it('makes a key without an extension for a name without one', () => {
    expect(isFormFileKey(formFileKey('README'))).toBe(true);
    expect(isFormFileKey(formFileKey('README.'))).toBe(true);
  });

  it('does not take a name a sender chose for a key it made', () => {
    expect(isFormFileKey('image-2.jpg')).toBe(false);
    expect(isFormFileKey('lagerregeln.pdf')).toBe(false);
  });
});
