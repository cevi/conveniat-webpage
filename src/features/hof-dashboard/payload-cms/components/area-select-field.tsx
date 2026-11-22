import { getHofDashboardAreas } from '@/features/hof-dashboard/api/hof-dashboard-areas';
import { SelectField } from '@payloadcms/ui';
import type { OptionObject, SelectFieldClient, TextFieldServerComponent } from 'payload';
import type React from 'react';

/**
 * Payload's own select, offering the tabs of the Hof dashboard. In the dashboard settings
 * themselves it offers the tabs as they are being edited, so a tab added there can be picked
 * for a deadline before saving; everywhere else the saved ones.
 */
export const AreaSelectField: TextFieldServerComponent = async ({
  clientField,
  data,
  payload,
  path,
  readOnly,
  schemaPath,
  permissions,
}) => {
  const editedAreas = (data as { areas?: unknown } | undefined)?.areas;
  // the rows as edited hold their names in the language being edited
  const savedAreas = Array.isArray(editedAreas) ? [] : await getHofDashboardAreas(payload);
  const options: OptionObject[] = Array.isArray(editedAreas)
    ? (editedAreas as { id?: unknown; label?: unknown }[]).flatMap(({ id, label }) =>
        typeof id === 'string' && id !== ''
          ? [{ value: id, label: typeof label === 'string' && label !== '' ? label : id }]
          : [],
      )
    : savedAreas.map((area) => ({ value: area.id, label: area.label }));

  const { label, required, admin } = clientField;
  const field: SelectFieldClient = {
    type: 'select',
    name: clientField.name,
    options,
    ...(label === undefined ? {} : { label }),
    ...(required === undefined ? {} : { required }),
    // Payload's client config types every admin option as present
    admin: {
      ...(admin?.width === undefined ? {} : { width: admin.width }),
      ...(admin?.description === undefined ? {} : { description: admin.description }),
      isClearable: required !== true,
      isSortable: false,
    } as NonNullable<SelectFieldClient['admin']>,
  };

  return (
    <SelectField
      field={field}
      path={path}
      readOnly={readOnly ?? false}
      schemaPath={schemaPath ?? path}
      permissions={permissions}
    />
  ) as React.ReactElement;
};
