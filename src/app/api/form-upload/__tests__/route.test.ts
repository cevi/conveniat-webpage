jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    APP_HOST_URL: 'https://conveniat27.ch',
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
import { hashUploaderSecret } from '@/features/payload-cms/payload-cms/plugins/form/form-file-uploader';
import { getPayload } from 'payload';

const FILE_ID = '0123456789abcdef01234567';
const PARTICIPANT = { id: 'participant', groups: [{ id: 4242 }] };
const WEB_CORE_TEAM_MEMBER = { id: 'editor', groups: [{ id: 105 }] };

describe('GET /api/form-upload', () => {
  const mockPayload = { auth: jest.fn(), find: jest.fn() };

  const lookUp = (user: object | null, cookie?: string): Promise<Response> => {
    mockPayload.auth.mockResolvedValue({ user });
    return GET(
      new Request(`http://localhost/api/form-upload?ids=${FILE_ID}`, {
        headers: cookie === undefined ? {} : { cookie },
      }),
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
    mockPayload.find.mockResolvedValue({ docs: [] });
  });

  it('refuses a request with neither a sign-in nor an upload of its own', async () => {
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

  it('only shows a browser without a sign-in the files it uploaded itself', async () => {
    // eslint-disable-next-line unicorn/no-null -- payload.auth reports a request without a session as null
    await lookUp(null, 'form-uploader=browser-secret');
    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { id: { in: [FILE_ID] } },
            { isTemporary: { equals: true } },
            { uploaderSecretHash: { equals: hashUploaderSecret('browser-secret') } },
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
  const upload = (file: File, allowedFileTypes = 'pdf', cookie?: string): Promise<Response> => {
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
    return POST(
      new Request('http://localhost/api/form-upload', {
        method: 'POST',
        body,
        headers: cookie === undefined ? {} : { cookie },
      }),
    );
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

  it('takes a file without a sign-in, owned by a secret only that browser holds', async () => {
    // eslint-disable-next-line unicorn/no-null -- payload.auth reports a request without a session as null
    mockPayload.auth.mockResolvedValue({ user: null });
    const response = await upload(new File([PDF], 'stand.pdf', { type: 'application/pdf' }));

    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    const secret = /form-uploader=([^;]+)/.exec(cookie)?.[1] ?? '';
    expect(secret).not.toBe('');
    const [[created]] = mockPayload.create.mock.calls as [[{ data: Record<string, unknown> }]];
    expect(created.data['uploaderSecretHash']).toBe(hashUploaderSecret(secret));
    expect(created.data['uploadedBy']).toBeUndefined();
  });

  it('keeps the secret a browser already holds, so its earlier files stay its own', async () => {
    // eslint-disable-next-line unicorn/no-null -- payload.auth reports a request without a session as null
    mockPayload.auth.mockResolvedValue({ user: null });
    const response = await upload(
      new File([PDF], 'stand.pdf', { type: 'application/pdf' }),
      'pdf',
      'form-uploader=browser-secret',
    );

    expect(response.headers.get('set-cookie')).toContain('form-uploader=browser-secret');
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          uploaderSecretHash: hashUploaderSecret('browser-secret'),
        }) as unknown,
      }),
    );
  });

  it('stores the file under a key the sender does not choose, named as they handed it in', async () => {
    const response = await upload(new File([PDF], 'image-2.jpg', { type: 'image/jpeg' }), 'all');

    expect(response.status).toBe(200);
    const [[created]] = mockPayload.create.mock.calls as [
      [{ data: { originalFilename: string }; file: { name: string } }],
    ];
    expect(created.file.name).not.toBe('image-2.jpg');
    expect(created.data.originalFilename).toBe('image-2.jpg');
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
