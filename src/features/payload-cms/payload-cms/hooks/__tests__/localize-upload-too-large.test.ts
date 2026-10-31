import { localizeUploadTooLarge } from '@/features/payload-cms/payload-cms/hooks/localize-upload-too-large';
import type { AfterErrorHookArgs } from 'payload';

/** Payload's APIError, which Jest cannot load from Payload's ESM build, carries its HTTP status. */
const apiError = (message: string, status: number): Error =>
  Object.assign(new Error(message), { status });

const answer = (error: Error, acceptLanguage: string): ReturnType<typeof localizeUploadTooLarge> =>
  localizeUploadTooLarge({
    error,
    context: {},
    req: { headers: new Headers({ 'Accept-Language': acceptLanguage }) },
  } as unknown as AfterErrorHookArgs);

describe('localizeUploadTooLarge', () => {
  it('answers an upload above the limit in the language of the admin panel', () => {
    expect(answer(apiError('File size limit has been reached', 413), 'fr')).toEqual({
      response: {
        errors: [
          {
            message:
              'Le fichier est trop volumineux. La taille maximale est de 100\u00A0Mo par fichier.',
          },
        ],
      },
      status: 413,
    });
  });

  it('leaves every other error as Payload answers it', () => {
    expect(answer(apiError('Not Found', 404), 'fr')).toBeUndefined();
    expect(answer(new Error('boom'), 'fr')).toBeUndefined();
  });
});
