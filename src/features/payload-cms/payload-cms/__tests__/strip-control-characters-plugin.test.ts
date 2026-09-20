import { stripControlCharactersPlugin } from '@/features/payload-cms/payload-cms/plugins/strip-control-characters-plugin';
import type { CollectionBeforeChangeHook, CollectionConfig, Config, GlobalConfig } from 'payload';

type HookArguments = Parameters<CollectionBeforeChangeHook>[0];

// the plugin is synchronous, while `Plugin` allows a promise as well
const applyPlugin = (config: Config): Config => stripControlCharactersPlugin(config) as Config;

// this is what `trackSlugHistory` does: a legacy slug reaches the new document without ever
// having passed through the hook itself
const copySlugFromOriginalDocument: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const stored = originalDoc as { slug: string };
  return { ...data, slugHistory: [stored.slug] };
};

const collection = (slug: string, hooks?: CollectionConfig['hooks']): CollectionConfig =>
  ({ slug, fields: [], hooks }) as CollectionConfig;

// collection and global hooks are typed apart but take the same shape of arguments here
const runBeforeChange = (
  hooks: readonly unknown[] | undefined,
  hookArguments: Partial<HookArguments> & { data: Record<string, unknown> },
): Record<string, unknown> => {
  let { data } = hookArguments;
  for (const hook of hooks ?? []) {
    data = (hook as CollectionBeforeChangeHook)({
      ...hookArguments,
      data,
    } as HookArguments) as Record<string, unknown>;
  }
  return data;
};

describe('stripControlCharactersPlugin', () => {
  it('cleans a collection that another plugin added, such as the form submissions', () => {
    // the form builder appends its collections while the config is built, so the plugin only
    // sees them because it runs after every other plugin
    const config = { collections: [collection('form-submissions')] } as Config;

    const [formSubmissions] = applyPlugin(config).collections ?? [];
    const data = runBeforeChange(formSubmissions?.hooks?.beforeChange, {
      data: { submissionData: [{ field: 'comment', value: 'Fröschli\u0002 Kinder' }] },
    });

    const [entry] = data['submissionData'] as { value: string }[];
    expect(entry?.value).toBe('Fröschli Kinder');
  });

  it('cleans globals as well', () => {
    const settingsGlobal: GlobalConfig = { slug: 'settings', fields: [] };
    const config = { globals: [settingsGlobal] } as Config;

    const [settings] = applyPlugin(config).globals ?? [];
    const data = runBeforeChange(settings?.hooks?.beforeChange, {
      data: { footerNote: 'Cevi\u0002 Schweiz' },
    });

    expect(data['footerNote']).toBe('Cevi Schweiz');
  });

  it('cleans what an earlier hook copies over from the stored document', () => {
    const config = {
      collections: [collection('generic-page', { beforeChange: [copySlugFromOriginalDocument] })],
    } as Config;

    const [genericPage] = applyPlugin(config).collections ?? [];
    const data = runBeforeChange(genericPage?.hooks?.beforeChange, {
      data: { slug: 'familienlager' },
      originalDoc: { slug: 'familien\u0002lager' },
    });

    expect(data['slugHistory']).toStrictEqual(['familienlager']);
  });

  it('leaves the archived mail artifacts of outgoing emails byte for byte as they arrived', () => {
    const config = { collections: [collection('outgoing-emails')] } as Config;

    const [outgoingEmails] = applyPlugin(config).collections ?? [];
    const data = runBeforeChange(outgoingEmails?.hooks?.beforeChange, {
      data: { rawDsnEmail: 'Diagnostic-Code: smtp;\u0002 550 unknown' },
    });

    expect(data['rawDsnEmail']).toBe('Diagnostic-Code: smtp;\u0002 550 unknown');
  });
});
