import { identifyFromRoster } from '@/features/wristbands/offline-lookup';
import { deriveBandKey, sealBand } from '@/features/wristbands/sealed-roster';
import type { SealedWristbandRoster } from '@/features/wristbands/types';

// the signature check has tests of its own; here a band is genuine when its signature is one of these
jest.mock('@/lib/nfc/ntag-signature', () => ({
  verifyNtagSignature: (_uid: string, signature: string): boolean =>
    [LEA_SIGNATURE, SPARE_SIGNATURE, LOST_SIGNATURE].includes(signature),
}));

const LEA_SIGNATURE = 'AB'.repeat(32);
const SPARE_SIGNATURE = 'CD'.repeat(32);
const LOST_SIGNATURE = 'EF'.repeat(32);
const FORGED_SIGNATURE = '12'.repeat(32);
const LEA = '04A1B2C3D4E5F6';
const LOST = '04112233445566';
const SPARE = '04998877665544';

const lea = {
  fullName: 'Lea Meier',
  nickname: 'Fuchs',
  hof: 'Cevi Uster',
  quartier: 'Quartier 5 - Greif',
};

let roster: SealedWristbandRoster;

beforeAll(async () => {
  roster = {
    entries: [
      await sealBand(await deriveBandKey(LEA, LEA_SIGNATURE), lea),
      await sealBand(await deriveBandKey(SPARE, SPARE_SIGNATURE), { hof: 'Züri 11' }),
    ],
    revokedUids: [LOST],
  };
});

describe('reading a band from the list on the phone', () => {
  it('names the wearer of a genuine band, checked', async () => {
    await expect(
      identifyFromRoster(roster, { uid: LEA, signature: LEA_SIGNATURE }),
    ).resolves.toEqual({ state: 'assigned', uid: LEA, ...lea, verified: true });
  });

  it('names the Hof of a spare band, as the server does', async () => {
    await expect(
      identifyFromRoster(roster, { uid: SPARE, signature: SPARE_SIGNATURE }),
    ).resolves.toEqual({ state: 'unassigned', uid: SPARE, hof: 'Züri 11' });
  });

  it('names nobody for a band with a forged signature', async () => {
    await expect(
      identifyFromRoster(roster, { uid: LEA, signature: FORGED_SIGNATURE }),
    ).resolves.toEqual({ state: 'not-genuine', uid: LEA });
  });

  it('names nobody for a blocked band', async () => {
    await expect(
      identifyFromRoster(roster, { uid: LOST, signature: LOST_SIGNATURE }),
    ).resolves.toEqual({ state: 'revoked', uid: LOST });
  });

  it('cannot answer for a band read without its signature', async () => {
    await expect(
      identifyFromRoster(roster, { uid: LEA, signature: null }),
    ).resolves.toBeUndefined();
  });

  it('opens no entry with the signature of another band', async () => {
    await expect(
      identifyFromRoster(roster, { uid: LEA, signature: SPARE_SIGNATURE }),
    ).resolves.toEqual({ state: 'unknown', uid: LEA });
  });

  it('knows no band that is not on the list', async () => {
    await expect(
      identifyFromRoster(roster, { uid: '04FFFFFFFFFFFF', signature: LEA_SIGNATURE }),
    ).resolves.toEqual({ state: 'unknown', uid: '04FFFFFFFFFFFF' });
  });

  it('reads the UID and the signature in any case', async () => {
    await expect(
      identifyFromRoster(roster, {
        uid: LEA.toLowerCase(),
        signature: LEA_SIGNATURE.toLowerCase(),
      }),
    ).resolves.toMatchObject({ state: 'assigned', uid: LEA });
  });

  it('names a test sticker without a signature by its UID alone', async () => {
    const stickers: SealedWristbandRoster = {
      entries: [await sealBand(await deriveBandKey(LEA, null), lea)],
      revokedUids: [],
    };
    await expect(identifyFromRoster(stickers, { uid: LEA, signature: null })).resolves.toEqual({
      state: 'assigned',
      uid: LEA,
      ...lea,
      verified: false,
    });
  });

  it('copes with no list and with a list an older app left on the phone', async () => {
    const band = { uid: LEA, signature: LEA_SIGNATURE };
    await expect(identifyFromRoster(undefined, band)).resolves.toEqual({
      state: 'unknown',
      uid: LEA,
    });
    const plain = { bands: [{ uid: LEA, ...lea }], revokedUids: [] };
    await expect(
      identifyFromRoster(plain as unknown as SealedWristbandRoster, band),
    ).resolves.toEqual({ state: 'unknown', uid: LEA });
    const broken = { entries: [42, { index: 'x' }], revokedUids: 'none' };
    await expect(
      identifyFromRoster(broken as unknown as SealedWristbandRoster, band),
    ).resolves.toEqual({ state: 'unknown', uid: LEA });
  });
});

describe('the list on a lost phone', () => {
  it('holds neither a name nor a UID of a band that is not blocked', () => {
    const stored = JSON.stringify(roster);
    for (const text of ['Lea', 'Meier', 'Fuchs', 'Cevi Uster', 'Greif', 'Züri', LEA, SPARE]) {
      expect(stored).not.toContain(text);
    }
  });
});
