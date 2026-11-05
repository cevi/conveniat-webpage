import { NXP_NTAG21X_PUBLIC_KEY, verifyNtagSignature } from '@/lib/nfc/ntag-signature';

/*
A key of our own on secp128r1, so the tests need no genuine band. The signatures were
made with OpenSSL the way NXP signs: `openssl pkeyutl -sign` over the raw UID bytes, no digest.
*/
const TEST_KEY = '04FCD6E276B9C1C66957FC0FE23E196E1A13AE1E301CBF0AB99C8B2728AEC32E9C';
const SIGNED = [
  {
    uid: '04A1B2C3D4E5F6',
    signature: '2FDC2C24EC64B0A3BD7CA3A86A924B6C252847B68119D52C6F42883920469EE3',
  },
  {
    uid: '0453C2A1B0FF80',
    signature: '387DBCA62BE86211BA20868D0E5B541970B43384E226177A77E9A573804B746C',
  },
];

describe('verifyNtagSignature', () => {
  it('accepts the signature made for a UID', () => {
    for (const { uid, signature } of SIGNED) {
      expect(verifyNtagSignature(uid, signature, TEST_KEY)).toBe(true);
    }
  });

  it('accepts hex in lower case, as a reader may send it', () => {
    const [{ uid, signature }] = SIGNED as [{ uid: string; signature: string }];
    expect(verifyNtagSignature(uid.toLowerCase(), signature.toLowerCase(), TEST_KEY)).toBe(true);
  });

  it('rejects a signature copied onto a chip with another UID', () => {
    const [first, second] = SIGNED as unknown as [{ signature: string }, { uid: string }];
    expect(verifyNtagSignature(second.uid, first.signature, TEST_KEY)).toBe(false);
  });

  it('rejects a signature made with another key', () => {
    const [{ uid, signature }] = SIGNED as [{ uid: string; signature: string }];
    expect(verifyNtagSignature(uid, signature, NXP_NTAG21X_PUBLIC_KEY)).toBe(false);
  });

  it('rejects what a copy without a signature answers to READ_SIG', () => {
    // the cheap stickers repeat pages 0 to 3 instead of a signature
    const pagesTwice = '53A1B2C3D4E5F60001020304050607085' + '3A1B2C3D4E5F600010203040506070';
    expect(verifyNtagSignature('53A1B2C3D4E5F6', pagesTwice, TEST_KEY)).toBe(false);
    expect(verifyNtagSignature('53A1B2C3D4E5F6', '00'.repeat(32), TEST_KEY)).toBe(false);
  });

  it('rejects malformed input instead of throwing', () => {
    expect(verifyNtagSignature('04A1', '00', TEST_KEY)).toBe(false);
    expect(verifyNtagSignature('04A1B2C3D4E5F6', 'zz'.repeat(32), TEST_KEY)).toBe(false);
    expect(verifyNtagSignature('04A1B2C3D4E5F6', '11'.repeat(32), '04' + '00'.repeat(32))).toBe(
      false,
    );
  });
});
