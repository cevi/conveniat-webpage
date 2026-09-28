import { resolveOwnBucket } from '@/lib/storage-buckets';

describe('resolveOwnBucket', () => {
  it('uses the dedicated bucket when one is configured', () => {
    expect(resolveOwnBucket('conveniat-bills', 'conveniat-files')).toBe('conveniat-bills');
  });

  it('falls back to the shared bucket when none is configured', () => {
    // Nothing creates the bucket, so an unconfigured deployment has to keep reading and
    // writing where its objects already are rather than pointing at one that is not there.
    const unset: string | undefined = undefined;
    expect(resolveOwnBucket(unset, 'conveniat-files')).toBe('conveniat-files');
  });

  it('treats an empty or blank value as unconfigured', () => {
    // An env var present but empty is the usual shape of "not set" in a compose stack.
    expect(resolveOwnBucket('', 'conveniat-files')).toBe('conveniat-files');
    expect(resolveOwnBucket('   ', 'conveniat-files')).toBe('conveniat-files');
  });

  it('trims a stray space rather than addressing a bucket that cannot exist', () => {
    expect(resolveOwnBucket(' conveniat-bills ', 'conveniat-files')).toBe('conveniat-bills');
  });
});
