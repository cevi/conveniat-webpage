'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { FieldDescription, FieldLabel, useField, useFormFields, useLocale } from '@payloadcms/ui';
import type { ArrayFieldClientComponent, ClientField } from 'payload';

const noEntries: StaticTranslationString = {
  de: 'Keine Einträge',
  en: 'No entries',
  fr: 'Aucune entrée',
};

const columnLabel = (field: ClientField, locale: Locale): string => {
  const name = 'name' in field ? field.name : '';
  const label = 'label' in field ? field.label : undefined;
  if (typeof label === 'string') return label;
  if (typeof label === 'object') {
    const translations = label as Partial<Record<string, string>>;
    return translations[locale] ?? translations['de'] ?? name;
  }
  return name;
};

const formatCell = (field: ClientField, value: unknown): string => {
  if (value === undefined || value === null || value === '') return '–';
  if (field.type === 'date' && typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '–';
};

/**
 * A read-only array as one table instead of a stack of collapsible rows, which put every
 * value of a VAT line or an issued bill on its own line and made a short list a full screen.
 */
export const ReadOnlyArrayTable: ArrayFieldClientComponent = ({ field, path }) => {
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const { rows = [] } = useField({ path, hasRows: true });
  const fields = useFormFields(([formFields]) => formFields);
  const columns = field.fields.filter((column) => 'name' in column && column.name !== 'id');

  return (
    <div className="field-type">
      {field.label === undefined ? undefined : <FieldLabel label={field.label} path={path} />}
      {field.admin?.description === undefined ? undefined : (
        <FieldDescription description={field.admin.description} path={path} />
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-(--theme-elevation-500)">{noEntries[locale]}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={'name' in column ? column.name : ''}
                    className="bg-(--theme-elevation-50) px-3 py-2 text-left font-normal text-(--theme-elevation-500)"
                  >
                    {columnLabel(column, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  {columns.map((column) => {
                    const name = 'name' in column ? column.name : '';
                    return (
                      <td
                        key={name}
                        className="border-t border-(--theme-elevation-100) px-3 py-2 text-(--theme-elevation-800)"
                      >
                        {formatCell(column, fields[`${path}.${index}.${name}`]?.value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReadOnlyArrayTable;
