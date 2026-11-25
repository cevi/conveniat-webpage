import { slugValidation } from '@/features/payload-cms/payload-cms/utils/slug-validation';
import type { PayloadRequest } from 'payload';

// Payload's own text check ships as an ES module Jest cannot load; it is not what is tested here.
jest.mock('payload/shared', () => ({ text: (): true => true }));

const PAGE_ID = '65f0c1a2b3d4e5f6a7b8c9d0';

type ValidateOptions = Parameters<typeof slugValidation>[1];

/**
 * Checks a slug with the options Payload passes. Saving on the server names the field's `path`;
 * the admin form state, which checks the fields again on the next change once a save has failed,
 * leaves it out.
 */
const validate = async (
  value: string,
  find: jest.Mock,
  options: Partial<ValidateOptions>,
): Promise<string | true> => {
  const request = {
    i18n: { language: 'de' },
    locale: 'de',
    payload: { find },
  } as unknown as PayloadRequest;

  return await slugValidation(value, {
    name: 'urlSlug',
    type: 'text',
    collectionSlug: 'generic-page',
    req: request,
    ...options,
  } as ValidateOptions);
};

const fromTheAdminForm: Partial<ValidateOptions> = {
  data: { id: PAGE_ID, seo: { urlSlug: 'lagerplatz' } },
  event: 'onChange',
};

const fromASave: Partial<ValidateOptions> = {
  data: { id: PAGE_ID, seo: { urlSlug: 'lagerplatz' } },
  event: 'submit',
  path: ['seo', 'urlSlug'],
};

describe('slugValidation', () => {
  it.each([
    ['the admin form', fromTheAdminForm],
    ['a save', fromASave],
  ])('accepts a slug no other page uses, checked from %s', async (_, options) => {
    const find = jest.fn().mockResolvedValue({ totalDocs: 0, docs: [] });

    await expect(validate('lagerplatz', find, options)).resolves.toBe(true);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'generic-page',
        where: {
          and: [{ id: { not_equals: PAGE_ID } }, { 'seo.urlSlug': { equals: 'lagerplatz' } }],
        },
      }),
    );
  });

  it.each([
    ['the admin form', fromTheAdminForm],
    ['a save', fromASave],
  ])('names the page that already uses the slug, checked from %s', async (_, options) => {
    const find = jest.fn().mockResolvedValue({
      totalDocs: 1,
      docs: [{ id: 'another-page', internalPageName: 'Lagerplatz' }],
    });

    await expect(validate('lagerplatz', find, options)).resolves.toBe(
      'Slug muss eindeutig sein, Duplikate gefunden in Lagerplatz (another-page)!',
    );
  });

  it('does not look for duplicates among redirects', async () => {
    const find = jest.fn();

    await expect(
      validate('lagerplatz', find, { ...fromTheAdminForm, collectionSlug: 'redirects' }),
    ).resolves.toBe(true);

    expect(find).not.toHaveBeenCalled();
  });
});
