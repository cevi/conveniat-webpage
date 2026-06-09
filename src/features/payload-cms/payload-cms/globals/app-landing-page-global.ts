import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mainContentBlocks } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { GlobalConfig } from 'payload';

export const AppLandingPageGlobal: GlobalConfig = {
  slug: 'app-landing-page',
  label: {
    en: 'App Landing Page',
    de: 'App Landing Page',
    fr: "Page d'accueil de l'application",
  },
  access: {
    read: () => true,
    update: isFullAdmin,
  },
  admin: {
    group: AdminPanelDashboardGroups.AppContent,
    hidden: shouldHideInAdminPanelIfNotAdmin,
    description: {
      en: 'Configure the app dashboard landing page: title, welcome content, and action card visibility.',
      de: 'Konfiguriere die App-Dashboard-Startseite: Titel, Willkommensinhalt und Sichtbarkeit der Aktionskarten.',
      fr: "Configurez la page d'accueil du tableau de bord de l'application : titre, contenu de bienvenue et visibilité des cartes d'action.",
    },
  },
  hooks: {
    afterChange: [flushPageCacheOnChangeGlobal],
  },
  fields: [
    {
      name: 'title',
      label: {
        en: 'App Title',
        de: 'App-Titel',
        fr: "Titre de l'application",
      },
      type: 'text',
      required: true,
      localized: true,
      defaultValue: 'conveniat27',
      admin: {
        description: {
          en: 'The title displayed in the app header bar on the dashboard (e.g. "Konekta App").',
          de: 'Der im App-Header auf dem Dashboard angezeigte Titel (z.B. "Konekta App").',
          fr: 'Le titre affiché dans la barre d\'en-tête de l\'application sur le tableau de bord (p.ex. "Konekta App").',
        },
      },
    },
    {
      name: 'pageContent',
      label: {
        en: 'Welcome Content',
        de: 'Willkommensinhalt',
        fr: 'Contenu de bienvenue',
      },
      type: 'blocks',
      required: false,
      localized: true,
      admin: {
        initCollapsed: true,
        description: {
          en: 'Optional content blocks displayed below the title on the app dashboard.',
          de: 'Optionale Inhaltsblöcke, die unterhalb des Titels auf dem App-Dashboard angezeigt werden.',
          fr: "Blocs de contenu optionnels affichés sous le titre sur le tableau de bord de l'application.",
        },
      },
      blocks: mainContentBlocks,
    },
    {
      name: 'showActionCards',
      label: {
        en: 'Show Action Cards',
        de: 'Aktionskarten anzeigen',
        fr: "Afficher les cartes d'action",
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: {
          en: 'When enabled, the action cards (quick links to app features) are shown on the dashboard.',
          de: 'Wenn aktiviert, werden die Aktionskarten (Schnelllinks zu App-Funktionen) auf dem Dashboard angezeigt.',
          fr: "Lorsqu'activé, les cartes d'action (liens rapides vers les fonctionnalités de l'application) sont affichées sur le tableau de bord.",
        },
      },
    },
  ],
};
