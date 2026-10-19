import { hashUploaderSecret } from '@/features/payload-cms/payload-cms/plugins/form/form-file-uploader';
import { markUploadedFilesPermanent } from '@/features/payload-cms/payload-cms/plugins/form/hooks/mark-uploaded-files-permanent';
import type { CollectionAfterChangeHook } from 'payload';

const OWN_FILE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const FOREIGN_FILE = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const POPULATED_OWN_FILE = 'cccccccccccccccccccccccc';
const ANONYMOUS_FILE = 'dddddddddddddddddddddddd';

/** The secret in the cookie of the browser that uploaded ANONYMOUS_FILE without a sign-in. */
const BROWSER_SECRET = 'browser-secret';

interface StoredUpload {
  id: string;
  form: string;
  isTemporary: boolean;
  uploadedBy?: string | { id: string } | null;
  uploaderSecretHash?: string;
  formSubmission?: string;
}

let uploads: Map<string, StoredUpload>;

const payload = {
  findByID: jest.fn(({ id }: { id: string }) => {
    const upload = uploads.get(id);
    return upload === undefined ? Promise.reject(new Error('Not Found')) : Promise.resolve(upload);
  }),
  update: jest.fn(({ id, data }: { id: string; data: Partial<StoredUpload> }) => {
    const upload = uploads.get(id);
    if (upload !== undefined) uploads.set(id, { ...upload, ...data });
    return Promise.resolve(upload);
  }),
};

/** Hands in a submission naming the given files, as the given user or from a browser's cookie. */
const submit = async (value: string, userId?: string, cookie?: string): Promise<void> => {
  await markUploadedFilesPermanent({
    doc: { id: 'submission-1', form: 'form-1', submissionData: [{ field: 'plan', value }] },
    operation: 'create',
    req: {
      user: userId === undefined ? undefined : { id: userId },
      headers: new Headers(cookie === undefined ? {} : { cookie }),
      payload,
    },
  } as unknown as Parameters<CollectionAfterChangeHook>[0]);
};

beforeEach(() => {
  jest.clearAllMocks();
  uploads = new Map(
    [
      { id: OWN_FILE, form: 'form-1', isTemporary: true, uploadedBy: 'hof-admin' },
      { id: FOREIGN_FILE, form: 'form-1', isTemporary: true, uploadedBy: 'someone-else' },
      {
        id: POPULATED_OWN_FILE,
        form: 'form-1',
        isTemporary: true,
        uploadedBy: { id: 'hof-admin' },
      },
      {
        id: ANONYMOUS_FILE,
        form: 'form-1',
        isTemporary: true,
        uploaderSecretHash: hashUploaderSecret(BROWSER_SECRET),
      },
    ].map((upload) => [upload.id, upload]),
  );
});

describe('markUploadedFilesPermanent', () => {
  it('claims the files the sender uploaded for the submission', async () => {
    await submit(`${OWN_FILE}, ${POPULATED_OWN_FILE}`, 'hof-admin');
    expect(uploads.get(OWN_FILE)).toMatchObject({
      isTemporary: false,
      formSubmission: 'submission-1',
    });
    expect(uploads.get(POPULATED_OWN_FILE)).toMatchObject({ isTemporary: false });
  });

  it('leaves a file someone else uploaded temporary, whoever names it', async () => {
    await submit(`${OWN_FILE}, ${FOREIGN_FILE}`, 'hof-admin');
    expect(uploads.get(FOREIGN_FILE)).toMatchObject({ isTemporary: true });
    expect(uploads.get(FOREIGN_FILE)?.formSubmission).toBeUndefined();
  });

  it('claims nothing for a submission without a signed-in sender', async () => {
    await submit(OWN_FILE);
    expect(uploads.get(OWN_FILE)).toMatchObject({ isTemporary: true });
  });

  it('claims a file uploaded without a sign-in for the browser that uploaded it', async () => {
    await submit(ANONYMOUS_FILE, undefined, `form-uploader=${BROWSER_SECRET}`);
    expect(uploads.get(ANONYMOUS_FILE)).toMatchObject({
      isTemporary: false,
      formSubmission: 'submission-1',
    });
  });

  it('leaves a file uploaded without a sign-in temporary for any other browser', async () => {
    await submit(ANONYMOUS_FILE, undefined, 'form-uploader=another-secret');
    await submit(ANONYMOUS_FILE, 'hof-admin');
    expect(uploads.get(ANONYMOUS_FILE)).toMatchObject({ isTemporary: true });
  });
});
