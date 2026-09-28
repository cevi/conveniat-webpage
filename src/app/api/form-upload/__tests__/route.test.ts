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

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { GET, POST } from '@/app/api/form-upload/route';
import { getPayload } from 'payload';

const FILE_ID = '0123456789abcdef01234567';
const PARTICIPANT = { id: 'participant', groups: [{ id: 4242 }] };
const WEB_CORE_TEAM_MEMBER = { id: 'editor', groups: [{ id: 105 }] };

describe('GET /api/form-upload', () => {
  const mockPayload = { auth: jest.fn(), find: jest.fn() };

  const lookUp = (user: object | null): Promise<Response> => {
    mockPayload.auth.mockResolvedValue({ user });
    return GET(new Request(`http://localhost/api/form-upload?ids=${FILE_ID}`));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
    mockPayload.find.mockResolvedValue({ docs: [] });
  });

  it('refuses an anonymous request', async () => {
    // eslint-disable-next-line unicorn/no-null -- payload.auth reports a request without a session as null
    const response = await lookUp(null);
    expect(response.status).toBe(401);
    expect(mockPayload.find).not.toHaveBeenCalled();
  });

  it('reads through the collection access rules for an editor', async () => {
    await lookUp(WEB_CORE_TEAM_MEMBER);
    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        overrideAccess: false,
        req: { user: WEB_CORE_TEAM_MEMBER },
        where: { id: { in: [FILE_ID] } },
      }),
    );
  });

  it('only shows a participant their own files that no submission has claimed yet', async () => {
    await lookUp(PARTICIPANT);
    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { id: { in: [FILE_ID] } },
            { isTemporary: { equals: true } },
            { uploadedBy: { equals: PARTICIPANT.id } },
          ],
        },
      }),
    );
  });
});

describe('POST /api/form-upload', () => {
  const mockPayload = { auth: jest.fn(), findByID: jest.fn(), create: jest.fn() };

  const PDF = '%PDF-1.4\n%%EOF';
  // markup a browser runs when it reads it as XHTML
  const XHTML = '<html xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></html>';

  /** Hands in a file on the form's upload field `plan`, which takes the given preset. */
  const upload = (file: File, allowedFileTypes = 'pdf'): Promise<Response> => {
    mockPayload.findByID.mockResolvedValue({
      id: 'form-1',
      sections: [
        { formSection: { fields: [{ blockType: 'fileUpload', name: 'plan', allowedFileTypes }] } },
      ],
    });
    const body = new FormData();
    body.set('file', file);
    body.set('formId', 'form-1');
    body.set('fieldName', 'plan');
    return POST(new Request('http://localhost/api/form-upload', { method: 'POST', body }));
  };

  /** The type the upload was stored with. */
  const storedType = (): string => {
    const [[created]] = mockPayload.create.mock.calls as [[{ file: { mimetype: string } }]];
    return created.file.mimetype;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
    mockPayload.auth.mockResolvedValue({ user: PARTICIPANT });
    mockPayload.create.mockResolvedValue({ id: FILE_ID });
  });

  it('records who uploaded the file, so only they can attach it', async () => {
    const response = await upload(new File([PDF], 'plan.pdf', { type: 'application/pdf' }));

    expect(response.status).toBe(200);
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'form_collection',
        data: expect.objectContaining({
          isTemporary: true,
          form: 'form-1',
          uploadedBy: PARTICIPANT.id,
        }) as unknown,
      }),
    );
  });

  it('stores the type read from the file, not the one the browser declares', async () => {
    const response = await upload(new File([PDF], 'plan.pdf', { type: 'text/xml' }));

    expect(response.status).toBe(200);
    expect(storedType()).toBe('application/pdf');
  });

  it('refuses markup on a PDF field, even named and declared as a PDF', async () => {
    const response = await upload(new File([XHTML], 'plan.pdf', { type: 'application/pdf' }));

    expect(response.status).toBe(400);
    expect(mockPayload.create).not.toHaveBeenCalled();
  });

  it('stores a file whose bytes tell nothing as one to download, whatever it claims', async () => {
    const response = await upload(new File([XHTML], 'plan.pdf', { type: 'text/xml' }), 'all');

    expect(response.status).toBe(200);
    expect(storedType()).toBe('application/octet-stream');
  });

  it('takes plain text and an old Word file on a documents field', async () => {
    const text = await upload(new File(['Znacht um 18 Uhr'], 'notes.txt'), 'documents');
    const word = await upload(
      new File(
        [Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), new Uint8Array(512)],
        'plan.doc',
      ),
      'documents',
    );

    expect(text.status).toBe(200);
    expect(word.status).toBe(200);
  });
});
