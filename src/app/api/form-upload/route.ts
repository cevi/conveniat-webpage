import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { formFileKey } from '@/lib/form-file-key';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { fileTypeFromBuffer } from 'file-type/core';
import { NextResponse } from 'next/server';
import { createLocalReq, getPayload } from 'payload';

const logger = createLogger('api:form-upload');

/** The types each preset takes, as read from a file's bytes. */
const PRESET_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  documents: [
    'application/pdf',
    // .doc and .xls are both Compound File Binary files, which is as far as their bytes tell
    'application/x-cfb',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

/**
 * Whether a field takes a file. A preset is checked against the type read from the file's
 * bytes, never the one the browser declares, which is the sender's word.
 */
function isFileTypeAllowed(
  fileName: string,
  detectedType: string | undefined,
  allowedTypeConfig?: string,
  customTypesConfig?: string,
): boolean {
  if (allowedTypeConfig === undefined || allowedTypeConfig === 'all') {
    return true;
  }

  const fileNameLower = fileName.toLowerCase();

  if (allowedTypeConfig === 'custom') {
    if (customTypesConfig === undefined || customTypesConfig.trim() === '') return true;
    const allowedExtensions = customTypesConfig
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .map((item) => (item.startsWith('.') ? item : `.${item}`));
    return allowedExtensions.some((item) => fileNameLower.endsWith(item));
  }

  const allowedPresets = PRESET_MIME_TYPES[allowedTypeConfig];
  if (allowedPresets === undefined) return true;

  if (detectedType !== undefined) return allowedPresets.includes(detectedType);
  // plain text carries no signature, so its name is all there is to go by
  return allowedPresets.includes('text/plain') && fileNameLower.endsWith('.txt');
}

interface FormFieldObject {
  blockType?: string;
  name?: string;
  fields?: FormFieldObject[];
  allowedFileTypes?: string;
  customAllowedFileTypes?: string;
}

function findFileUploadField(
  fields: FormFieldObject[],
  targetName: string,
): FormFieldObject | undefined {
  for (const field of fields) {
    if (field.blockType === 'fileUpload' && field.name === targetName) {
      return field;
    }
    if (Array.isArray(field.fields)) {
      const nestedMatch = findFileUploadField(field.fields, targetName);
      if (nestedMatch !== undefined) return nestedMatch;
    }
  }
  return undefined;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const idsParameter = searchParams.get('ids');

    if (idsParameter === null || idsParameter.trim() === '') {
      return NextResponse.json({ docs: [] });
    }

    const ids = idsParameter
      .split(',')
      .map((id) => id.trim())
      .filter((id) => /^[0-9a-fA-F]{24}$/.test(id));

    if (ids.length === 0) {
      return NextResponse.json({ docs: [] });
    }

    const payload = await getPayload({ config });

    const { user } = await payload.auth({ headers: request.headers });
    if (user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessRequest = await createLocalReq({ user }, payload);

    // Editors read through the collection's own access rules, as over REST. Anyone else is a
    // participant restoring the files they just attached to a form they are still filling in:
    // their own uploads, while still temporary. Once a submission claims a file, it is out of
    // reach here.
    const result = hasAdminOrWebAccess({ req: accessRequest })
      ? await payload.find({
          collection: 'form_collection',
          where: { id: { in: ids } },
          limit: ids.length,
          depth: 0,
          overrideAccess: false,
          req: accessRequest,
        })
      : await payload.find({
          collection: 'form_collection',
          where: {
            and: [
              { id: { in: ids } },
              { isTemporary: { equals: true } },
              { uploadedBy: { equals: user.id } },
            ],
          },
          limit: ids.length,
          depth: 0,
          overrideAccess: true,
        });

    const documents = result.docs.map((fileDocument) => ({
      id: fileDocument.id,
      docId: fileDocument.id,
      originalFilename:
        typeof fileDocument.originalFilename === 'string' &&
        fileDocument.originalFilename.length > 0
          ? fileDocument.originalFilename
          : fileDocument.filename,
      filename: fileDocument.filename,
      filesize: fileDocument.filesize ?? 0,
      mimeType: fileDocument.mimeType,
      url: typeof fileDocument.url === 'string' ? fileDocument.url : undefined,
    }));

    return NextResponse.json({ docs: documents });
  } catch (error) {
    logger.error('Failed to fetch the form upload details', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const formId = formData.get('formId') as string | null;
    const fieldName = formData.get('fieldName') as string | null;

    if (file === null || formId === null || fieldName === null || fieldName.trim() === '') {
      return NextResponse.json(
        { error: 'Missing required fields: file, formId, and fieldName' },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    const { user } = await payload.auth({ headers: request.headers });
    if (user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch form configuration
    let form;
    try {
      form = await payload.findByID({
        collection: 'forms',
        id: formId,
      });
    } catch {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check file upload limit (in MB)
    const limitMB = typeof form.fileUploadLimitMB === 'number' ? form.fileUploadLimitMB : 10;
    const maxSizeBytes = limitMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds the limit of ${limitMB} MB` },
        { status: 400 },
      );
    }

    // Resolve matched fileUpload block recursively across form sections
    let matchedField: FormFieldObject | undefined;

    if (Array.isArray(form.sections)) {
      for (const sectionWrapper of form.sections) {
        const fields = sectionWrapper.formSection.fields as FormFieldObject[] | undefined;
        if (!Array.isArray(fields)) continue;

        matchedField = findFileUploadField(fields, fieldName);
        if (matchedField !== undefined) break;
      }
    }

    if (matchedField === undefined) {
      return NextResponse.json(
        { error: `Field "${fieldName}" is not a valid file upload field for this form` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Stored as the file's type and served with it, so a file claiming to be a PDF but holding
    // markup never reaches a browser as markup. A file whose bytes say nothing downloads.
    const detected = await fileTypeFromBuffer(buffer);
    const detectedType = detected?.mime;
    const mimeType = detectedType ?? 'application/octet-stream';

    const isAllowed = isFileTypeAllowed(
      file.name,
      detectedType,
      matchedField.allowedFileTypes,
      matchedField.customAllowedFileTypes,
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: `File type "${file.name}" is not allowed` },
        { status: 400 },
      );
    }

    const fileDocument = await payload.create({
      collection: 'form_collection',
      data: {
        isTemporary: true,
        form: formId,
        originalFilename: file.name,
        uploadedBy: user.id,
      },
      file: {
        data: buffer,
        mimetype: mimeType,
        // The stored name is the object key, which the sender must not choose: named like a
        // public image, it would overwrite it. Downloads are named after `originalFilename`.
        name: formFileKey(file.name),
        size: file.size,
      },
      req: { user },
    });

    return NextResponse.json({
      docId: fileDocument.id,
      filename: file.name,
      filesize: file.size,
      mimetype: mimeType,
      url: typeof fileDocument.url === 'string' ? fileDocument.url : undefined,
    });
  } catch (error) {
    logger.error('Failed to upload a file for a form', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
