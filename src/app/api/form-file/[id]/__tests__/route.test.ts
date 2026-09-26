jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
  },
}));

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
  createLocalReq: jest.fn(({ user }: { user?: unknown }) => Promise.resolve({ user })),
}));

jest.mock('@/lib/s3', () => ({
  S3_BUCKET_NAME: 'bucket',
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
import { getPayload } from 'payload';

const FILE_ID = '0123456789abcdef01234567';
const PARTICIPANT = { id: 'participant', groups: [{ id: 4242 }] };
const WEB_CORE_TEAM_MEMBER = { id: 'editor', groups: [{ id: 105 }] };

// eslint-disable-next-line unicorn/no-null -- payload.auth reports a request without a session as null
const ANONYMOUS = null;

const fileOn = (submission: { approved: boolean } | undefined, isTemporary = false): object => ({
  id: FILE_ID,
  isTemporary,
  filename: 'stored-name.pdf',
  originalFilename: 'upload.pdf',
  mimeType: 'application/pdf',
  formSubmission: submission === undefined ? undefined : { id: 'submission', ...submission },
});

describe('GET /api/form-file/[id]', () => {
  const mockPayload = { auth: jest.fn(), findByID: jest.fn() };

  const download = (user: object | null, fileDocument: object): Promise<Response> => {
    mockPayload.auth.mockResolvedValue({ user });
    mockPayload.findByID.mockResolvedValue(fileDocument);
    return GET(new Request(`http://localhost/api/form-file/${FILE_ID}`), {
      params: Promise.resolve({ id: FILE_ID }),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
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
});
