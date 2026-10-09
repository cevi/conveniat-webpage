// The modules under test are server-only; the guard throws outside a Server Component.
jest.mock('server-only', () => ({}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { JWT_SECRET: 'test-secret' },
}));

const mockHasCookie = jest.fn<boolean, [string]>();
jest.mock('next/headers', () => ({
  cookies: (): Promise<{ has: (name: string) => boolean }> =>
    Promise.resolve({ has: mockHasCookie }),
}));

const mockGetAdminSession = jest.fn<Promise<unknown>, []>();
jest.mock('@/utils/is-admin-session', () => ({
  getAdminSession: (): Promise<unknown> => mockGetAdminSession(),
}));

jest.mock('@/utils/auth-helpers', () => ({ isValidNextAuthUser: (): boolean => true }));
jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  Roles: { FullAdmin: 'full-admin', WebCoreTeam: 'web-core-team' },
  hasAccessToThisUser: (): boolean => true,
}));
jest.mock('@/components/preview-warning-client', () => ({
  PreviewWarningClient: (): undefined => undefined,
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): { debug: () => void } => ({ debug: (): void => {} }),
}));

import { resolvePreviewAccess } from '@/features/payload-cms/utils/preview/preview-utils';
import { generatePreviewToken } from '@/utils/preview-token';
import * as jwt from 'jsonwebtoken';

const PAGE = '66f1a0c2b7e4d9a1c3e5f701';
const OTHER_PAGE = '66f1a0c2b7e4d9a1c3e5f702';

const NO_PREVIEW = { renderInPreviewMode: false, previewDocumentId: undefined };

describe('resolvePreviewAccess', () => {
  beforeEach(() => {
    mockHasCookie.mockReturnValue(false);
    mockGetAdminSession.mockImplementation(() => Promise.resolve());
  });

  it('opens the document a shared link was minted for', async () => {
    const token = await generatePreviewToken(PAGE);

    await expect(
      resolvePreviewAccess({ preview: 'true', 'preview-token': token }),
    ).resolves.toEqual({ renderInPreviewMode: true, previewDocumentId: PAGE });
  });

  it('keeps a shared link on its own document when the URL names another one', async () => {
    const token = await generatePreviewToken(PAGE);

    const access = await resolvePreviewAccess({
      preview: 'true',
      previewId: OTHER_PAGE,
      'preview-token': token,
    });

    expect(access.previewDocumentId).toBe(PAGE);
  });

  it('refuses an expired link', async () => {
    const token = await generatePreviewToken(PAGE, -60);

    await expect(
      resolvePreviewAccess({ preview: 'true', previewId: PAGE, 'preview-token': token }),
    ).resolves.toEqual(NO_PREVIEW);
  });

  it('refuses a token that was not signed here', async () => {
    const token = jwt.sign({ id: PAGE }, 'another-secret', { expiresIn: 3600 });

    await expect(
      resolvePreviewAccess({ preview: 'true', previewId: PAGE, 'preview-token': token }),
    ).resolves.toEqual(NO_PREVIEW);
  });

  it('refuses a signed token that names no document', async () => {
    const token = jwt.sign({ url: '/de/lagerplatz' }, 'test-secret', { expiresIn: 3600 });

    await expect(
      resolvePreviewAccess({ preview: 'true', 'preview-token': token }),
    ).resolves.toEqual(NO_PREVIEW);
  });

  it('refuses a request without a token or an editor session', async () => {
    await expect(resolvePreviewAccess({ preview: 'true', previewId: PAGE })).resolves.toEqual(
      NO_PREVIEW,
    );
  });

  it('lets an editor preview every draft, with or without a shared link', async () => {
    mockHasCookie.mockReturnValue(true);
    mockGetAdminSession.mockResolvedValue({ user: { uuid: 'editor' } });
    const token = await generatePreviewToken(PAGE);

    const unscoped = { renderInPreviewMode: true, previewDocumentId: undefined };
    await expect(resolvePreviewAccess({ preview: 'true' })).resolves.toEqual(unscoped);
    await expect(
      resolvePreviewAccess({ preview: 'true', 'preview-token': token }),
    ).resolves.toEqual(unscoped);
  });
});
