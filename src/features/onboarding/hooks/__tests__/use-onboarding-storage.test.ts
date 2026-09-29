import { hasCachedAppShell } from '@/features/onboarding/hooks/use-onboarding-storage';

const cacheWith = (...paths: string[]): Pick<Cache, 'keys'> => ({
  keys: (): Promise<readonly Request[]> =>
    Promise.resolve(paths.map((path) => new Request(`https://conveniat27.ch${path}`))),
});

describe('hasCachedAppShell', () => {
  it('lets a user start offline who opened the dashboard but never downloaded', async () => {
    await expect(hasCachedAppShell(cacheWith('/entrypoint', '/app/dashboard'))).resolves.toBe(true);
  });

  it('recognises the dashboard cached under a locale prefix', async () => {
    await expect(hasCachedAppShell(cacheWith('/fr/app/dashboard?app-mode=true'))).resolves.toBe(
      true,
    );
  });

  it('keeps the no-internet screen when the dashboard was never cached', async () => {
    await expect(
      hasCachedAppShell(
        cacheWith('/entrypoint', '/app/chat', '/app/map', '/app/emergency', '/', '/~offline'),
      ),
    ).resolves.toBe(false);
  });
});
