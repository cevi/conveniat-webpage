import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import {
  getLocalizedFieldPaths,
  type LocalizedFieldReference,
} from '@/features/payload-cms/payload-cms/services/field-introspection';
import {
  translateLexicalRichText,
  translateTexts,
} from '@/features/payload-cms/payload-cms/services/google-translate';
import type { PayloadHandler } from 'payload';

// Deep object traversal modifying localized values in-place
async function translateData(
  data: Record<string, unknown>,
  paths: LocalizedFieldReference[],
  targetLang: string,
  sourceLang: string,
): Promise<Record<string, unknown>> {
  // Precompute a lookup map for translatable paths
  const pathMap = new Map<string, LocalizedFieldReference>();
  for (const p of paths) {
    pathMap.set(p.path.join('.'), p);
  }

  // Accumulate plaintext fields for batching
  const plainTextFields: { obj: Record<string, unknown>; key: string; text: string }[] = [];

  async function traverse(object_: unknown, currentPath: string[]): Promise<void> {
    if (!object_ || typeof object_ !== 'object') return;

    // Check if the current object corresponds to a known array path
    for (const key of Object.keys(object_)) {
      const parentObject = object_ as Record<string, unknown>;
      const val = parentObject[key];
      const newPath = [...currentPath, key];

      // Handle arrays
      if (Array.isArray(val)) {
        for (const item of val) {
          const isObject = typeof item === 'object' && item !== null;
          if (isObject) {
            const itemObject = item as Record<string, unknown>;
            await (itemObject['blockType']
              ? traverse(itemObject, [...newPath, '[]', itemObject['blockType'] as string])
              : traverse(itemObject, [...newPath, '[]']));
          } else {
            await traverse(item, [...newPath, '[]']);
          }
        }
        continue;
      }

      // Check if this path matches a localized leaf node using the map
      const match = pathMap.get(newPath.join('.'));

      if (match && typeof val === 'string' && val.trim() !== '') {
        if (match.type === 'text' || match.type === 'textarea') {
          // add to batch
          plainTextFields.push({ obj: parentObject, key, text: val });
        }
      } else if (match && typeof val === 'object' && val !== null && match.type === 'richText') {
        // Translate rich text directly (awaiting inside the loop, acceptable here)
        parentObject[key] = await translateLexicalRichText(
          val as import('@/features/payload-cms/payload-cms/services/google-translate').LexicalNode,
          targetLang,
          sourceLang,
        );
      } else if (val && typeof val === 'object') {
        // Recurse into nested objects
        await traverse(val, newPath);
      }
    }
  }

  await traverse(data, []);

  // Batch translate all plaintext fields
  if (plainTextFields.length > 0) {
    const texts = plainTextFields.map((f) => f.text);
    const results = await translateTexts(texts, targetLang, sourceLang);
    for (const [index, plainTextField] of plainTextFields.entries()) {
      plainTextField.obj[plainTextField.key] =
        results[index]?.translatedText ?? plainTextField.text;
    }
  }

  return data;
}

export const autoTranslateHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body =
        typeof request.json === 'function'
          ? ((await request.json()) as Record<string, unknown>)
          : (request as unknown as { body: Record<string, unknown> }).body;
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const collection = body['collection'] as string | undefined;
    const id = body['id'] as string | number | undefined;
    const sourceLocale = body['sourceLocale'] as 'all' | 'en' | 'de' | 'fr' | undefined;
    const targetLocale = body['targetLocale'] as 'all' | 'en' | 'de' | 'fr' | undefined;

    if (!collection || !id || !sourceLocale || !targetLocale) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { payload } = request;
    if (!(collection in payload.collections)) {
      return Response.json({ error: 'Collection not found' }, { status: 404 });
    }
    const collectionConfig =
      payload.collections[collection as keyof typeof payload.collections].config;

    // Identify translatable fields
    const localizedFieldPaths = getLocalizedFieldPaths(collectionConfig.fields);

    // Fetch the document in the SOURCE locale

    const sourceData = await payload.findByID({
      collection: collection as never,
      id: id,
      locale: sourceLocale,
      depth: 0,
    });

    // Now, let's also fetch the document in the TARGET locale in order to prevent overwriting existing data (if overwriteExisting is false)

    const targetData = await payload.findByID({
      collection: collection as never,
      id: id,
      locale: targetLocale,
      depth: 0,
    });

    // Strip internal/system fields from the source data we want to write back
    const fieldsToTranslate = Object.assign({}, sourceData) as Record<string, unknown>;
    delete fieldsToTranslate['id'];
    delete fieldsToTranslate['createdAt'];
    delete fieldsToTranslate['updatedAt'];
    delete fieldsToTranslate['_localized_status'];
    delete fieldsToTranslate['urlSlug']; // We don't translate urlSlugs directly

    // We should not modify the existing publishing status for the target locale
    // targetData was fetched with targetLocale, so _localized_status is already flat.
    const currentStatus = (targetData as Record<string, unknown>)['_localized_status'] ?? {
      published: false,
    };

    // Let's actually execute the deep translation
    await translateData(fieldsToTranslate, localizedFieldPaths, targetLocale, sourceLocale);

    // Keep the target locale's existing publishing status unchanged
    fieldsToTranslate['_localized_status'] = currentStatus;

    // Ensure the internal _locale field matches the target
    fieldsToTranslate['_locale'] = targetLocale;

    // Save back to the payload using the TARGET locale
    const result = await payload.update({
      req: request,
      collection: collection as never,
      id: id,
      locale: targetLocale as never,
      data: fieldsToTranslate as never,
    });

    return Response.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Failed to auto-translate document: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};
