jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
    FEATURE_ENABLE_HOF_DASHBOARD: true,
  },
}));

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
  createLocalReq: jest.fn(({ user }: { user?: unknown }, payload: unknown) =>
    Promise.resolve({ user, payload }),
  ),
}));

jest.mock('@/lib/s3', () => ({
  FORM_FILE_BUCKET_NAME: 'form-files',
  s3Client: {
    send: jest.fn(() =>
      Promise.resolve({
        Body: { transformToWebStream: (): ReadableStream => new Blob(['content']).stream() },
      }),
    ),
  },
}));

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { GET } from '@/app/api/form-file/[id]/route';
import { environmentVariables } from '@/config/environment-variables';
import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import { s3Client } from '@/lib/s3';
import { getPayload } from 'payload';

const FILE_ID = '0123456789abcdef01234567';
const PARTICIPANT = { id: 'participant', groups: [{ id: 4242 }] };
const WEB_CORE_TEAM_MEMBER = { id: 'editor', groups: [{ id: 105 }] };

// eslint-disable-next-line unicorn/no-null -- payload.auth reports a request without a session as null
const ANONYMOUS = null;

/** Switches the Hof dashboard of the mocked deployment on or off. */
const setHofDashboard = (enabled: boolean): void => {
  (environmentVariables as { FEATURE_ENABLE_HOF_DASHBOARD: boolean }).FEATURE_ENABLE_HOF_DASHBOARD =
    enabled;
};

/** Hof Nord is run by the Cevi.DB group 990001, Hof Süd by 990002. */
const HOEFE = [
  { id: 'hof-nord', name: 'Hof Nord', groupId: '990001' },
  { id: 'hof-sued', name: 'Hof Süd', groupId: '990002' },
];
/** The address administrator of Hof Nord's group, who hands in its plans. */
const HOF_NORD_ADMINISTRATOR = {
  id: 'hof-nord-admin',
  groups: [{ id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS }],
};

/** The forms a file can be handed in with, by id. */
const FORMS: Record<string, object> = {
  // a contact form, off the dashboard
  // eslint-disable-next-line unicorn/no-null -- Payload stores an unset select as null
  'form-contact': { hofDashboard: { area: null } },
  // a Hof's plan, handed in by its address administrators only
  'form-plan': { hofDashboard: { area: 'infrastructure', entries: 'versions' } },
  // Stadtleben stands, which any participant hands in and the website shows once approved
  'form-stadtleben': {
    hofDashboard: { area: 'program', entries: 'entries', onlyHofAdministrators: false },
  },
};

const fileOn = (
  submission: { approved: boolean; hof?: string; form?: string } | undefined,
  isTemporary = false,
): object => ({
  id: FILE_ID,
  isTemporary,
  filename: 'stored-name.pdf',
  originalFilename: 'upload.pdf',
  mimeType: 'application/pdf',
  formSubmission:
    submission === undefined
      ? undefined
      : { id: 'submission', form: 'form-contact', ...submission },
});

describe('GET /api/form-file/[id]', () => {
  const mockPayload = {
    auth: jest.fn(),
    findByID: jest.fn(),
    find: jest.fn(({ where }: { where: { groupId: { in: string[] } } }) =>
      Promise.resolve({ docs: HOEFE.filter((hof) => where.groupId.in.includes(hof.groupId)) }),
    ),
  };

  const download = (user: object | null, fileDocument: object): Promise<Response> => {
    mockPayload.auth.mockResolvedValue({ user });
    mockPayload.findByID.mockImplementation(
      ({ collection, id }: { collection: string; id: string }) =>
        // eslint-disable-next-line unicorn/no-null -- findByID with disableErrors answers null
        Promise.resolve(collection === 'forms' ? (FORMS[id] ?? null) : fileDocument),
    );
    return GET(new Request(`http://localhost/api/form-file/${FILE_ID}`), {
      params: Promise.resolve({ id: FILE_ID }),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
    setHofDashboard(true);
  });

  it('refuses an anonymous request for a file on an unapproved submission', async () => {
    const response = await download(ANONYMOUS, fileOn({ approved: false }));
    expect(response.status).toBe(401);
  });

  it('refuses a logged-in participant a file on an unapproved submission', async () => {
    const response = await download(PARTICIPANT, fileOn({ approved: false }));
    expect(response.status).toBe(403);
  });

  it('refuses a logged-in participant a temporary file', async () => {
    const response = await download(PARTICIPANT, fileOn(undefined, true));
    expect(response.status).toBe(403);
  });

  it('serves a logged-in participant a file on an approved submission', async () => {
    const response = await download(PARTICIPANT, fileOn({ approved: true }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('content');
  });

  it('serves an anonymous request a file on an approved submission', async () => {
    const response = await download(ANONYMOUS, fileOn({ approved: true }));
    expect(response.status).toBe(200);
  });

  it('serves an editor who may read form submissions a file on an unapproved submission', async () => {
    const response = await download(WEB_CORE_TEAM_MEMBER, fileOn({ approved: false }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('reads the file from the bucket of the form files', async () => {
    await download(ANONYMOUS, fileOn({ approved: true }));
    const [[command]] = (s3Client.send as jest.Mock).mock.calls as [
      [{ input: { Bucket: string } }],
    ];
    expect(command.input.Bucket).toBe('form-files');
  });

  it('shows a PDF in the browser', async () => {
    const response = await download(ANONYMOUS, fileOn({ approved: true }));
    expect(response.headers.get('Content-Disposition')).toMatch(/^inline;/);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('downloads a file of a type a browser could run, instead of showing it', async () => {
    const response = await download(ANONYMOUS, {
      ...fileOn({ approved: true }),
      mimeType: 'text/xml',
    });
    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment;/);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it("serves a Hof's address administrator their own Hof's file, which the dashboard lists", async () => {
    const response = await download(
      HOF_NORD_ADMINISTRATOR,
      fileOn({ approved: false, hof: 'hof-nord' }),
    );
    expect(response.status).toBe(200);
  });

  it("refuses a Hof's address administrator another Hof's file", async () => {
    const response = await download(
      HOF_NORD_ADMINISTRATOR,
      fileOn({ approved: false, hof: 'hof-sued' }),
    );
    expect(response.status).toBe(403);
  });

  it("refuses a Hof's address administrator a file their Hof has not handed in yet", async () => {
    const response = await download(
      HOF_NORD_ADMINISTRATOR,
      fileOn({ approved: false, hof: 'hof-nord' }, true),
    );
    expect(response.status).toBe(403);
  });

  it("keeps a Hof's approved plan private: approving it accepts it, it does not publish it", async () => {
    const plan = fileOn({ approved: true, hof: 'hof-nord', form: 'form-plan' });
    await expect(download(ANONYMOUS, plan)).resolves.toMatchObject({ status: 401 });
    await expect(download(PARTICIPANT, plan)).resolves.toMatchObject({ status: 403 });
    // the Hof and the Ressort still read it
    await expect(download(HOF_NORD_ADMINISTRATOR, plan)).resolves.toMatchObject({ status: 200 });
    await expect(download(WEB_CORE_TEAM_MEMBER, plan)).resolves.toMatchObject({ status: 200 });
  });

  it('publishes an approved Stadtleben stand, which the website shows', async () => {
    const stand = fileOn({ approved: true, hof: 'hof-sued', form: 'form-stadtleben' });
    await expect(download(ANONYMOUS, stand)).resolves.toMatchObject({ status: 200 });
    // until it is approved, it is the Hof's
    const handedIn = fileOn({ approved: false, hof: 'hof-sued', form: 'form-stadtleben' });
    await expect(download(ANONYMOUS, handedIn)).resolves.toMatchObject({ status: 401 });
  });

  it('publishes any approved submission on a deployment without the Hof dashboard', async () => {
    setHofDashboard(false);
    const response = await download(
      ANONYMOUS,
      fileOn({ approved: true, hof: 'hof-nord', form: 'form-plan' }),
    );
    expect(response.status).toBe(200);
  });

  it('opens no Hof file on a deployment without the Hof dashboard', async () => {
    setHofDashboard(false);
    const response = await download(
      HOF_NORD_ADMINISTRATOR,
      fileOn({ approved: false, hof: 'hof-nord' }),
    );
    expect(response.status).toBe(403);
  });
});
