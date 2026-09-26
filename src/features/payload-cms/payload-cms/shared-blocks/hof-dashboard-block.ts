import type { Block } from 'payload';

/**
 * Places the Hof dashboard on a page. It has no settings of its own: what it shows comes from
 * the "Hof-Dashboard Einstellungen" and from the Hof of whoever opens the page.
 */
export const hofDashboardBlock: Block = {
  slug: 'hofDashboardBlock',
  interfaceName: 'HofDashboardBlock',
  imageURL: '/admin-block-images/form-block.png',
  imageAltText: 'Hof dashboard block',
  labels: {
    singular: { de: 'Hof-Dashboard', en: 'Hof dashboard', fr: 'Tableau de bord du Hof' },
    plural: { de: 'Hof-Dashboards', en: 'Hof dashboards', fr: 'Tableaux de bord du Hof' },
  },
  admin: {
    disableBlockName: true,
  },
  fields: [],
};
