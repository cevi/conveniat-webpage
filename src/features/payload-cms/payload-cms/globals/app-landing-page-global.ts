import { environmentVariables as env } from '@/config/environment-variables';
import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  mainContentBlockOptions,
  mainContentBlocks,
} from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { asLocalizedGlobal } from '@/features/payload-cms/payload-cms/utils/localized-global';
import { smartphoneBreakpoints } from '@/features/payload-cms/utils/smartphone-breakpoints';
import {
  DEFAULT_QUICK_ACCESS,
  QUICK_ACCESS_TILE_IDS,
  QUICK_ACCESS_TILE_LABELS,
} from '@/features/settings/quick-access';
import type { GlobalConfig } from 'payload';

export const AppLandingPageGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'app-landing-page',
  label: {
    en: 'App Landing Page',
    de: 'App Landing Page',
    fr: "Page d'accueil de l'application",
  },
  access: {
    read: () => true,
    update: isFullAdmin,
    // the drafts are only previewed, by whoever may edit them
    readVersions: isFullAdmin,
  },
  admin: {
    group: AdminPanelDashboardGroups.AppContent.label,
    hidden: shouldHideInAdminPanelIfNotAdmin,
    description: {
      en: 'Configure the app dashboard landing page: title, welcome content, and the action cards with their default selection.',
      de: 'Konfiguriere die App-Dashboard-Startseite: Titel, Willkommensinhalt und die Aktionskarten mit ihrer Standardauswahl.',
      fr: "Configurez la page d'accueil du tableau de bord de l'application : titre, contenu de bienvenue et les cartes d'action avec leur sélection par défaut.",
    },
    // The draft is previewed as Home of the app. The URL is a placeholder, `LivePreviewRestorer`
    // points it at the preview of the dashboard in the edited locale.
    livePreview: {
      url: `${env.APP_HOST_URL}/de/app/dashboard-preview?preview=true`,
      openByDefault: true,
      breakpoints: smartphoneBreakpoints,
    },
    components: {
      elements: {
        beforeDocumentControls: [
          {
            path: '@/features/payload-cms/payload-cms/components/live-preview-restorer',
            // Home is only ever seen on a phone; same viewport as an iPhone 15 Pro
            clientProps: { defaultBreakpoint: 'iphone-14-pro' },
          },
        ],
      },
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
      filterOptions: mainContentBlockOptions,
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
    {
      // not localized: Home shows the same tiles in every language
      name: 'defaultQuickAccessTiles',
      label: {
        en: 'Default Action Cards',
        de: 'Standardauswahl der Aktionskarten',
        fr: "Cartes d'action par défaut",
      },
      type: 'select',
      hasMany: true,
      required: true,
      options: QUICK_ACCESS_TILE_IDS.map((id) => ({
        value: id,
        label: QUICK_ACCESS_TILE_LABELS[id],
      })),
      defaultValue: [...DEFAULT_QUICK_ACCESS],
      admin: {
        condition: (data) => data['showActionCards'] !== false,
        description: {
          en: 'The cards and their order for everybody who has not arranged their own, and for guests. Drag a card to change the order. Whoever cannot use a card does not see it: participants, for example, see no wristbands. Whoever has arranged their own keeps it.',
          de: 'Die Karten und ihre Reihenfolge für alle, die sich keine eigene Auswahl eingerichtet haben, und für Gäste. Ziehe eine Karte, um die Reihenfolge zu ändern. Wer eine Karte nicht nutzen kann, sieht sie nicht: Teilnehmende etwa sehen keine Armbänder. Wer eine eigene Auswahl eingerichtet hat, behält sie.',
          fr: "Les cartes et leur ordre pour toutes les personnes qui n'ont pas choisi les leurs, et pour les invités. Fais glisser une carte pour changer l'ordre. Qui ne peut pas utiliser une carte ne la voit pas : les participants, par exemple, ne voient pas les bracelets. Qui a choisi ses propres cartes les garde.",
        },
      },
    },
  ],
});
