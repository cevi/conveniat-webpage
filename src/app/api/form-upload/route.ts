import config from '@payload-config';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

const PRESET_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf', '.pdf'],
  images: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.txt',
  ],
};

function isFileTypeAllowed(
  file: File,
  allowedTypeConfig?: string,
  customTypesConfig?: string,
): boolean {
  if (allowedTypeConfig === undefined || allowedTypeConfig === 'all') {
    return true;
  }

  const fileNameLower = file.name.toLowerCase();
  const fileTypeLower = file.type.toLowerCase();

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

  return (
    allowedPresets.includes(fileTypeLower) ||
    allowedPresets.some((preset) => preset.startsWith('.') && fileNameLower.endsWith(preset))
  );
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
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      return NextResponse.json({ docs: [] });
    }

    const payload = await getPayload({ config });

    const result = await payload.find({
      collection: 'form_collection',
      where: {
        id: { in: ids },
      },
      limit: ids.length,
      depth: 0,
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
    console.error('Failed to fetch form upload details:', error);
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

    const isAllowed = isFileTypeAllowed(
      file,
      matchedField.allowedFileTypes,
      matchedField.customAllowedFileTypes,
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: `File type "${file.name}" is not allowed` },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileDocument = await payload.create({
      collection: 'form_collection',
      data: {
        isTemporary: true,
        form: formId,
        originalFilename: file.name,
      },
      file: {
        data: buffer,
        mimetype: file.type.length > 0 ? file.type : 'application/octet-stream',
        name: file.name,
        size: file.size,
      },
    });

    return NextResponse.json({
      docId: fileDocument.id,
      filename: file.name,
      filesize: file.size,
      mimetype: file.type,
      url: typeof fileDocument.url === 'string' ? fileDocument.url : undefined,
    });
  } catch (error) {
    console.error('Failed to upload file for form:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
