import { Config, Field, GlobalConfig, Tab } from 'payload';
import { localizedDefaultValue } from '@/payload-cms/utils/localized-default-value';
import { RoutableConfig, RoutableGlobalConfig } from '@payload-config';

/**
 * Helper function to add a prefix to all localized strings in an object.
 *
 * @param prefix
 * @param localized
 */
const addPrefixToLocalized = <T extends Record<string, string>>(prefix: string, localized: T): T =>
  Object.fromEntries(Object.entries(localized).map(([key, value]) => [key, prefix + value])) as T;

const generateURLSlugField = (global: RoutableGlobalConfig): Field => {
  return {
    name: 'urlSlug',
    label: {
      en: 'URL Slug (hardcoded)',
      de: 'URL-Slug (hardcoded)',
      fr: "Slug d'URL (hardcoded)",
    },
    type: 'text',
    localized: true,
    required: true,
    admin: {
      readOnly: true,
    },
    defaultValue: localizedDefaultValue(addPrefixToLocalized('/', global.urlSlug)),
  };
};

const globalAddReadOnlySlugField = (global: RoutableGlobalConfig): GlobalConfig => ({
  ...global.payloadGlobal,
  fields: global.payloadGlobal.fields.map(
    (field: Field): Field => ({
      ...(field.type === 'tabs' && 'tabs' in field
        ? {
            ...field,
            tabs: field.tabs.map((tab: Tab) => ({
              ...tab,
              ...('name' in tab && tab.name == 'seo'
                ? { fields: [...tab.fields, generateURLSlugField(global)] }
                : {}),
            })),
          }
        : field),
    }),
  ),
});

/**
 * Helper function to remove route information from the config.
 * This is necessary to make the extended config compatible with PayloadCMS.
 *
 *
 * TODO: this function should validate that there are not two global pages
 *  with the same URL slug (how to handle different locales?)
 *
 * @param config
 */
export const dropRouteInfo = (config: RoutableConfig): Config => ({
  ...config,
  globals:
    config.globals?.map((global) => ({
      ...('payloadGlobal' in global ? globalAddReadOnlySlugField(global) : global),
    })) ?? [],
  collections:
    config.collections?.map((collection) => ({
      ...('payloadCollection' in collection ? collection.payloadCollection : collection),
    })) ?? [],
});
