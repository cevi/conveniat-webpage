import { canWriteStory, isEditor } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { StaticTranslationString } from '@/types/types';
import type { CollectionConfig, DateField } from 'payload';

/**
 * The story is for Leitende and appears bit by bit, so nobody but the editors reads it through
 * the API: the app reads it on the server with `src/features/story/api/story-reader.ts`, which
 * drops everything that is not visible yet. The translation team updates it like any content.
 */
export const storyAccess: NonNullable<CollectionConfig['access']> = {
  read: isEditor,
  update: isEditor,
  create: canWriteStory,
  delete: canWriteStory,
};

export const storyAdminGroup = AdminPanelDashboardGroups.AppStory.label;

/**
 * When an entry of the story appears in the app. Until then it does not exist for anybody but
 * the editors, so the story can be written for the whole week in advance without spoilers.
 */
export const visibleFromField = (
  description: StaticTranslationString,
  options: { required?: boolean; sidebar?: boolean; width?: string } = {},
): DateField => ({
  name: 'visibleFrom',
  label: { de: 'Sichtbar ab', en: 'Visible from', fr: 'Visible dès' },
  type: 'date',
  required: options.required ?? true,
  index: true,
  admin: {
    ...(options.sidebar === false ? {} : { position: 'sidebar' as const }),
    ...(options.width === undefined ? {} : { width: options.width }),
    date: { pickerAppearance: 'dayAndTime', displayFormat: 'EEE dd.MM.yyyy HH:mm' },
    description,
  },
});

/** The camp day an entry belongs to, as the programme stores its dates. */
export const campDayField = (required: boolean): DateField => ({
  name: 'day',
  label: { de: 'Tag', en: 'Day', fr: 'Jour' },
  type: 'date',
  required,
  index: true,
  admin: {
    date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE dd.MM.yyyy' },
  },
});
