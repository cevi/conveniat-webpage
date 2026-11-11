import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { setFeatureFlag } from '@/lib/db/redis';
import {
  FEATURE_FLAG_CONTACT_LIST_INCLUDES_AVP,
  FEATURE_FLAG_CONTACT_LIST_INCLUDES_FUNKTIONEN,
  FEATURE_FLAG_CONTACT_LIST_INCLUDES_HOF,
  FEATURE_FLAG_CREATE_CHATS_ENABLED,
  FEATURE_FLAG_FORUM_ENABLED,
  FEATURE_FLAG_FORUM_MODERATION,
  FEATURE_FLAG_HELPER_SHIFTS_ENABLED,
  FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS,
  FEATURE_FLAG_IMAGE_UPLOAD_ENABLED,
  FEATURE_FLAG_PHOTO_CONTEST_ENABLED,
  FEATURE_FLAG_RESERVATIONS_ENABLED,
  FEATURE_FLAG_RESTRICT_CONTACT_LIST,
  FEATURE_FLAG_SEND_MESSAGES,
  FEATURE_HIDE_HOF_AND_QUARTIER,
} from '@/lib/feature-flags';
import type { CheckboxField, GlobalConfig } from 'payload';

/**
 * One group the restricted contact list adds to the address book, shown only while the
 * restriction is on, since it does nothing without it.
 */
const contactListGroupField = (
  name: string,
  flag: string,
  label: Record<'en' | 'de' | 'fr', string>,
  description: Record<'en' | 'de' | 'fr', string>,
): CheckboxField => ({
  name,
  label,
  type: 'checkbox',
  defaultValue: true,
  admin: {
    description,
    condition: (data): boolean => data['restrictContactList'] !== false,
    components: {
      Field:
        '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
    },
  },
  hooks: {
    afterChange: [
      async ({ value }): Promise<void> => {
        await setFeatureFlag(flag, Boolean(value));
      },
    ],
  },
});

export const AppFeatureFlags: GlobalConfig = {
  slug: 'app-feature-flags',
  label: {
    en: 'App Feature Flags',
    de: 'App-Funktions-Flags',
    fr: 'Indicateurs de fonctionnalités',
  },
  admin: {
    group: AdminPanelDashboardGroups.AppOperations.label,
    hidden: shouldHideInAdminPanelIfNotAdmin,
  },
  access: {
    read: () => true,
    update: isFullAdmin,
  },
  hooks: {
    afterChange: [flushPageCacheOnChangeGlobal],
  },
  fields: [
    {
      name: 'globalMessagingEnabled',
      label: 'Enable Global Messaging',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles the ability for users to send messages globally.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_SEND_MESSAGES, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'createChatsEnabled',
      label: 'Enable Chat Creation',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Toggles the ability for users to create new chats (1-on-1 and Group). Emergency/Support chats are excluded.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            // Redis key matching the constant: 'create_chats_enabled'
            await setFeatureFlag(FEATURE_FLAG_CREATE_CHATS_ENABLED, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'restrictContactList',
      label: {
        en: 'Restrict the chat contact list',
        de: 'Kontaktliste im Chat einschränken',
        fr: 'Restreindre la liste de contacts du chat',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: {
          en: 'When on, the contact list for new chats shows only the people in the own address book, that is whose chat QR code or wristband was scanned (or who scanned one’s own), and the groups switched on below. Nobody is removed from an existing chat. When off, it shows everyone.',
          de: 'Wenn aktiv, zeigt die Kontaktliste für neue Chats nur die Personen im eigenen Adressbuch, also deren Chat-QR-Code oder Armband gescannt wurde (oder die den eigenen gescannt haben), sowie die unten eingeschalteten Gruppen. Aus bestehenden Chats wird niemand entfernt. Wenn inaktiv, zeigt sie alle.',
          fr: "Si activé, la liste de contacts pour les nouvelles discussions ne montre que les personnes du carnet d'adresses, dont le code QR de chat ou le bracelet a été scanné (ou qui ont scanné le vôtre), ainsi que les groupes activés ci-dessous. Personne n'est retiré d'une discussion existante. Si désactivé, elle montre tout le monde.",
        },
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_RESTRICT_CONTACT_LIST, Boolean(value));
          },
        ],
      },
    },
    contactListGroupField(
      'contactListIncludesHof',
      FEATURE_FLAG_CONTACT_LIST_INCLUDES_HOF,
      {
        en: 'People from the own Hof',
        de: 'Personen aus dem eigenen Hof',
        fr: 'Personnes du même Hof',
      },
      {
        en: 'Everyone registered at a Hof the user is registered at.',
        de: 'Alle, die im gleichen Hof angemeldet sind.',
        fr: 'Toutes les personnes inscrites dans le même Hof.',
      },
    ),
    contactListGroupField(
      'contactListIncludesFunktionen',
      FEATURE_FLAG_CONTACT_LIST_INCLUDES_FUNKTIONEN,
      {
        en: 'People with a function in the camp',
        de: 'Personen mit einer Funktion im Lager',
        fr: 'Personnes avec une fonction au camp',
      },
      {
        en: 'Everyone holding one of the functions listed under "Funktionen und Adressbuch", e.g. in the Kernteam or a Ressort.',
        de: 'Alle mit einer der Funktionen unter «Funktionen und Adressbuch», z.B. im Kernteam oder in einem Ressort.',
        fr: 'Toutes les personnes ayant une des fonctions de « Funktionen und Adressbuch », p. ex. au Kernteam ou dans un Ressort.',
      },
    ),
    contactListGroupField(
      'contactListIncludesAvp',
      FEATURE_FLAG_CONTACT_LIST_INCLUDES_AVP,
      {
        en: 'AVP of every Hof',
        de: 'AVP aller Höfe',
        fr: 'AVP de tous les Höfe',
      },
      {
        en: 'The AVP (Abteilungsverantwortliche Person) of each Hof, also for people from other Höfe.',
        de: 'Die AVP (Abteilungsverantwortliche Person) jedes Hofs, auch für Personen aus anderen Höfen.',
        fr: 'L’AVP (Abteilungsverantwortliche Person) de chaque Hof, aussi pour les personnes d’autres Höfe.',
      },
    ),
    {
      name: 'hideHofAndQuartier',
      label: 'Hide Hof and Quartier',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Hides the Hof and Quartier sections in the app. This is used for testing purposes.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_HIDE_HOF_AND_QUARTIER, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'helperShiftsEnabled',
      label: {
        en: 'Show Helper Shifts (Schichteinsätze)',
        de: 'Schichteinsätze anzeigen',
        fr: 'Afficher les services de helpers',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Toggles visibility of the Helper Shifts (Schichteinsätze) menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_HELPER_SHIFTS_ENABLED, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'hideFullHelperShifts',
      label: {
        en: 'Hide Full Helper Slots for Unenrolled Users',
        de: 'Voll ausgebuchte Schichteinsätze für Nicht-Angemeldete ausblenden',
        fr: 'Masquer les services complets pour les personnes non inscrites',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: {
          en: 'Toggles hiding full helper slots for users who are not enrolled in them.',
          de: 'Blendet voll ausgebuchte Schichteinsätze für nicht angemeldete Personen aus.',
          fr: 'Masque les services complets pour les personnes non inscrites.',
        },
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'imageUploadEnabled',
      label: {
        en: 'Show Image Upload',
        de: 'Bilder hochladen anzeigen',
        fr: 'Afficher le téléchargement de photos',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles visibility of the Image Upload menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_IMAGE_UPLOAD_ENABLED, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'photoContestEnabled',
      label: {
        en: 'Show Photo Contest',
        de: 'Foto-Wettbewerb anzeigen',
        fr: 'Afficher le concours photo',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles visibility of the Photo Contest menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_PHOTO_CONTEST_ENABLED, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'reservationsEnabled',
      label: {
        en: 'Show Reservations',
        de: 'Reservationen anzeigen',
        fr: 'Afficher les réservations',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles visibility of the Reservations menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_RESERVATIONS_ENABLED, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'forumEnabled',
      label: {
        en: 'Show conveniat27 Forum',
        de: 'conveniat27 Forum anzeigen',
        fr: 'Afficher le forum conveniat27',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles visibility of the conveniat27 Forum menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_FORUM_ENABLED, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'forumModerationRequired',
      label: {
        en: 'Forum: approve posts before they are published',
        de: 'Forum: Beiträge vor Veröffentlichung freigeben',
        fr: 'Forum : approuver les publications avant leur parution',
      },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: {
          en: 'Against spam. While on, a new forum post is seen only by its author and the moderators (the Kernteam of its topic and the piket on duty) until one of them approves it. Posts by the Kernteam need no approval, comments are never held back.',
          de: 'Gegen Spam. Solange eingeschaltet, sehen einen neuen Beitrag nur die Person, die ihn geschrieben hat, und die Moderation (das Kernteam des Themas und das Piket im Dienst), bis jemand davon ihn freigibt. Beiträge des Kernteams brauchen keine Freigabe, Kommentare werden nie zurückgehalten.',
          fr: 'Contre le spam. Tant que c’est activé, une nouvelle publication n’est visible que par son auteur et la modération (l’équipe centrale du thème et le piquet de service) jusqu’à ce que quelqu’un l’approuve. Les publications de l’équipe centrale n’ont pas besoin d’approbation, les commentaires ne sont jamais retenus.',
        },
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_FLAG_FORUM_MODERATION, Boolean(value));
          },
        ],
      },
    },
  ],
};
