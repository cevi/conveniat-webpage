import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const CampCategoryCollection: CollectionConfig = {
    slug: 'camp-categories',
    admin: {
        useAsTitle: 'title',
        group: AdminPanelDashboardGroups.AppContent,
        defaultColumns: ['title', 'colorTheme'],
    },
    labels: {
        singular: {
            en: 'Camp Category',
            de: 'Lager-Kategorie',
            fr: 'Catégorie du camp',
        },
        plural: {
            en: 'Camp Categories',
            de: 'Lager-Kategorien',
            fr: 'Catégories du camp',
        },
    },
    access: {
        read: () => true,
    },
    fields: [
        {
            name: 'title',
            label: {
                en: 'Title',
                de: 'Titel',
                fr: 'Titre',
            },
            type: 'text',
            required: true,
            localized: true,
        },
        {
            name: 'colorTheme',
            label: {
                en: 'Color Theme',
                de: 'Farbschema',
                fr: 'Thème de couleur',
            },
            type: 'select',
            options: [
                { label: 'Purple', value: 'purple' },
                { label: 'Green', value: 'green' },
                { label: 'Blue', value: 'blue' },
                { label: 'Gray', value: 'gray' },
                { label: 'Indigo', value: 'indigo' },
                { label: 'Amber', value: 'amber' },
                { label: 'Rose', value: 'rose' },
                { label: 'Cyan', value: 'cyan' },
                { label: 'Orange', value: 'orange' },
            ],
            required: true,
            defaultValue: 'gray',
        },
    ],
};
