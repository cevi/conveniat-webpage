import { HEIC_DECODER_URL, HEIC_DECODER_VERSION } from '@/utils/heic-decoder';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('heic decoder', () => {
  it('names the version of heic-to that build:heic-decoder copies into public/', () => {
    const installed = JSON.parse(
      readFileSync(path.join(process.cwd(), 'node_modules/heic-to/package.json'), 'utf8'),
    ) as { version: string };

    expect(HEIC_DECODER_VERSION).toBe(installed.version);
    expect(HEIC_DECODER_URL).toBe(`/heic-to-${installed.version}.js`);
  });
});
