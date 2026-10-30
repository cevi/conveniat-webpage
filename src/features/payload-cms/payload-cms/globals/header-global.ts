import { environmentVariables as env } from '@/config/environment-variables';
import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { asLocalizedGlobal } from '@/features/payload-cms/payload-cms/utils/localized-global';
import { smartphoneBreakpoints } from '@/features/payload-cms/utils/smartphone-breakpoints';
import type { ArrayField, Field, GlobalConfig } from 'payload';

const rowLabel = {
  RowLabel: {
    path: '@/features/payload-cms/payload-cms/components/main-menu-row-label#MainEntryRowLabel',
  },
};

/** The header bar and its menu only show from 1280px, the phones show the drawer. */
const desktopBreakpoint = {
  name: 'desktop',
  label: 'Desktop (1440x900)',
  width: 1440,
  height: 900,
};

const labelField: Field = {
  name: 'label',
  label: { en: 'Label', de: 'Bezeichnung', fr: 'Libellé' },
  type: 'text',
  required: true,
};

/** The entries below a column of the menu: links, and a group of links one level further down. */
const subMenuLevel = (
  label: { en: string; de: string; fr: string },
  children?: ArrayField,
): ArrayField => ({
  name: 'subMenu',
  label,
  type: 'array',
  localized: true,
  admin: { components: rowLabel },
  fields:
    children === undefined
      ? [labelField, LinkField(false)]
      : [labelField, LinkField(false), children],
});

const MainMenu: Field = {
  name: 'mainMenu',
  label: { en: 'Main Menu', de: 'Hauptmenü', fr: 'Menu principal' },
  type: 'array',
  localized: true,
  admin: {
    description: {
      en: 'Each entry with sub entries becomes a column of the menu, the entries without sub entries are listed together in the column "More". Pinned entries are also shown directly in the header bar on large screens.',
      de: 'Jeder Eintrag mit Unterpunkten wird eine Spalte im Menü, die Einträge ohne Unterpunkte stehen zusammen in der Spalte «Weiteres». Angeheftete Einträge stehen auf grossen Bildschirmen zusätzlich direkt in der Kopfzeile.',
      fr: 'Chaque entrée avec des sous-entrées devient une colonne du menu, les entrées sans sous-entrées sont regroupées dans la colonne « Plus ». Les entrées épinglées apparaissent aussi directement dans la barre d’en-tête sur les grands écrans.',
    },
    components: rowLabel,
  },
  fields: [
    labelField,
    {
      name: 'pinnedToHeader',
      label: {
        en: 'Pin to the header bar',
        de: 'In der Kopfzeile anheften',
        fr: 'Épingler dans la barre d’en-tête',
      },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: {
          en: 'Shown next to "Menu" on large screens. An entry with sub entries opens the menu at its column. Entries that do not fit are left out of the bar, never out of the menu.',
          de: 'Steht auf grossen Bildschirmen neben «Menü». Ein Eintrag mit Unterpunkten öffnet das Menü bei seiner Spalte. Was nicht mehr Platz hat, fällt aus der Kopfzeile weg, nie aus dem Menü.',
          fr: 'Affiché à côté de « Menu » sur les grands écrans. Une entrée avec des sous-entrées ouvre le menu sur sa colonne. Ce qui ne tient pas disparaît de la barre, jamais du menu.',
        },
      },
    },
    LinkField(false),
    subMenuLevel(
      {
        en: 'Entries of this column',
        de: 'Einträge dieser Spalte',
        fr: 'Entrées de cette colonne',
      },
      subMenuLevel(
        { en: 'Links of this group', de: 'Links dieser Gruppe', fr: 'Liens de ce groupe' },
        subMenuLevel({ en: 'Sub links', de: 'Unterlinks', fr: 'Sous-liens' }),
      ),
    ),
  ],
};

export const HeaderGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'header',
  access: {
    read: () => true,
    update: hasAdminOrWebAccess,
  },
  label: { en: 'Header and menu', de: 'Kopfzeile und Menü', fr: 'En-tête et menu' },
  admin: {
    group: AdminPanelDashboardGroups.WebpageContent.label,
    hidden: shouldHideInAdminPanel,
    // The menu is previewed like a page: the start page with the draft menu, opened. The URL is a
    // placeholder, `LivePreviewRestorer` points it at the start page in the edited locale.
    livePreview: {
      url: `${env.APP_HOST_URL}/de?preview=true&menu=open`,
      openByDefault: true,
      breakpoints: [desktopBreakpoint, ...smartphoneBreakpoints],
    },
    components: {
      elements: {
        beforeDocumentControls: [
          '@/features/payload-cms/payload-cms/components/live-preview-restorer',
        ],
      },
    },
  },
  hooks: { afterChange: [flushPageCacheOnChangeGlobal] },
  fields: [MainMenu],
});
