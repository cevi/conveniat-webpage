import { z } from 'zod';

/**
 * What one kind of browser upload may store. Every presigned upload declares one, and
 * `createPresignedUploadUrl` signs nothing outside of it.
 */
export interface UploadPolicy<ContentType extends string = string> {
  /** The MIME types allowed, each with the extension its object is stored under. */
  extensions: Readonly<Record<ContentType, string>>;
  maxBytes: number;
}

/**
 * The fields a procedure handing out an upload URL takes from the browser, limited to what
 * the policy allows. Spread it into the procedure's input next to its own fields.
 *
 * @param policy - the upload the procedure hands out URLs for
 * @returns the zod shape of `contentType` and `contentLength`
 */
export const uploadInputShape = <ContentType extends string>(
  policy: UploadPolicy<ContentType>,
): { contentType: z.ZodEnum<[ContentType, ...ContentType[]]>; contentLength: z.ZodNumber } => ({
  contentType: z.enum(Object.keys(policy.extensions) as [ContentType, ...ContentType[]]),
  contentLength: z.number().int().positive().max(policy.maxBytes),
});
