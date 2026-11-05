import { identifyFromRoster } from '@/features/wristbands/offline-lookup';
import type { WristbandRoster } from '@/features/wristbands/types';

// the signature check has tests of its own; here a band is genuine when its signature says so
jest.mock('@/lib/nfc/ntag-signature', () => ({
  verifyNtagSignature: (_uid: string, signature: string): boolean => signature === GOOD_SIGNATURE,
}));

const GOOD_SIGNATURE = 'AB'.repeat(32);
const FORGED_SIGNATURE = 'CD'.repeat(32);
const LEA = '04A1B2C3D4E5F6';
const LOST = '04112233445566';

const roster: WristbandRoster = {
  bands: [
    {
      uid: LEA,
      fullName: 'Lea Meier',
      nickname: 'Fuchs',
      hof: 'Cevi Uster',
      quartier: 'Quartier 5 - Greif',
    },
  ],
  revokedUids: [LOST],
};

describe('reading a band from the list on the phone', () => {
  it('names the wearer of a genuine band, checked', () => {
    expect(identifyFromRoster(roster, { uid: LEA, signature: GOOD_SIGNATURE })).toEqual({
      state: 'assigned',
      uid: LEA,
      fullName: 'Lea Meier',
      nickname: 'Fuchs',
      hof: 'Cevi Uster',
      quartier: 'Quartier 5 - Greif',
      verified: true,
    });
  });

  it('names nobody for a band with a forged signature', () => {
    expect(identifyFromRoster(roster, { uid: LEA, signature: FORGED_SIGNATURE })).toEqual({
      state: 'not-genuine',
      uid: LEA,
    });
  });

  it('says a band without a signature was not checked', () => {
    expect(identifyFromRoster(roster, { uid: LEA, signature: null })).toMatchObject({
      state: 'assigned',
      verified: false,
    });
  });

  it('names nobody for a blocked band', () => {
    expect(identifyFromRoster(roster, { uid: LOST, signature: GOOD_SIGNATURE })).toEqual({
      state: 'revoked',
      uid: LOST,
    });
  });

  it('knows no band that is not on the list', () => {
    expect(
      identifyFromRoster(roster, { uid: '04FFFFFFFFFFFF', signature: GOOD_SIGNATURE }),
    ).toEqual({ state: 'unknown', uid: '04FFFFFFFFFFFF' });
  });

  it('reads the UID in any case', () => {
    expect(
      identifyFromRoster(roster, { uid: LEA.toLowerCase(), signature: GOOD_SIGNATURE }),
    ).toMatchObject({ state: 'assigned', uid: LEA });
  });

  it('copes with no list and with a list an older app left on the phone', () => {
    const band = { uid: LEA, signature: GOOD_SIGNATURE };
    expect(identifyFromRoster(undefined, band)).toEqual({ state: 'unknown', uid: LEA });

    const older = {
      bands: [{ uid: LEA, fullName: 'Lea Meier' }, 42],
    } as unknown as WristbandRoster;
    expect(identifyFromRoster(older, band)).toEqual({
      state: 'assigned',
      uid: LEA,
      fullName: 'Lea Meier',
      nickname: null,
      hof: '',
      quartier: null,
      verified: true,
    });
  });
});
