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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const formId = formData.get('formId') as string | null;
    const fieldName = formData.get('fieldName') as string | null;

    if (file === null || formId === null) {
      return NextResponse.json(
        { error: 'Missing required fields: file and formId' },
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

    // Validate file type if field name was supplied
    if (fieldName !== null && fieldName.length > 0 && Array.isArray(form.sections)) {
      let matchedField: { allowedFileTypes?: string; customAllowedFileTypes?: string } | undefined;

      for (const sectionWrapper of form.sections) {
        const fields = sectionWrapper.formSection.fields;
        if (!Array.isArray(fields)) continue;

        for (const field of fields) {
          if (field.blockType === 'fileUpload' && field.name === fieldName) {
            matchedField = field as unknown as {
              allowedFileTypes?: string;
              customAllowedFileTypes?: string;
            };
            break;
          }
          if (field.blockType === 'conditionedBlock' && Array.isArray(field.fields)) {
            for (const subField of field.fields) {
              if (subField.blockType === 'fileUpload' && subField.name === fieldName) {
                matchedField = subField as unknown as {
                  allowedFileTypes?: string;
                  customAllowedFileTypes?: string;
                };
                break;
              }
            }
          }
        }
        if (matchedField !== undefined) break;
      }

      if (matchedField !== undefined) {
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
      }
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
