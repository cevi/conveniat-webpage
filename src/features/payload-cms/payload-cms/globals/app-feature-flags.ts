import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { featureFlags, type FeatureFlagName } from '@/lib/feature-flags';
import { rememberSavedFeatureFlags } from '@/lib/read-feature-flags';
import type { CheckboxField, GlobalAfterChangeHook, GlobalConfig } from 'payload';

type Text = string | Record<'en' | 'de' | 'fr', string>;

interface FlagFieldText {
  label: Text;
  description: Text;
  /** Shows the field only while it has an effect. */
  condition?: (data: Record<string, unknown>) => boolean;
}

/** The contact list groups refine the restriction and do nothing without it. */
const whileContactListRestricted = (data: Record<string, unknown>): boolean =>
  data['restrictContactList'] !== false;

/**
 * The admin panel's text for every flag, in the order the panel lists them. A flag missing here
 * does not compile, so every flag can be switched.
 */
const flagFieldTexts: Record<FeatureFlagName, FlagFieldText> = {
  globalMessagingEnabled: {
    label: 'Enable Global Messaging',
    description: 'Toggles the ability for users to send messages globally.',
  },
  createChatsEnabled: {
    label: 'Enable Chat Creation',
    description:
      'Toggles the ability for users to create new chats (1-on-1 and Group). Emergency/Support chats are excluded.',
  },
  restrictContactList: {
    label: {
      en: 'Restrict the chat contact list',
      de: 'Kontaktliste im Chat einschränken',
      fr: 'Restreindre la liste de contacts du chat',
    },
    description: {
      en: 'When on, the contact list for new chats shows only the people in the own address book, that is whose chat QR code or wristband was scanned (or who scanned one’s own), and the groups switched on below. Nobody is removed from an existing chat. When off, it shows everyone.',
      de: 'Wenn aktiv, zeigt die Kontaktliste für neue Chats nur die Personen im eigenen Adressbuch, also deren Chat-QR-Code oder Armband gescannt wurde (oder die den eigenen gescannt haben), sowie die unten eingeschalteten Gruppen. Aus bestehenden Chats wird niemand entfernt. Wenn inaktiv, zeigt sie alle.',
      fr: "Si activé, la liste de contacts pour les nouvelles discussions ne montre que les personnes du carnet d'adresses, dont le code QR de chat ou le bracelet a été scanné (ou qui ont scanné le vôtre), ainsi que les groupes activés ci-dessous. Personne n'est retiré d'une discussion existante. Si désactivé, elle montre tout le monde.",
    },
  },
  contactListIncludesHof: {
    label: {
      en: 'People from the own Hof',
      de: 'Personen aus dem eigenen Hof',
      fr: 'Personnes du même Hof',
    },
    description: {
      en: 'Everyone registered at a Hof the user is registered at.',
      de: 'Alle, die im gleichen Hof angemeldet sind.',
      fr: 'Toutes les personnes inscrites dans le même Hof.',
    },
    condition: whileContactListRestricted,
  },
  contactListIncludesFunktionen: {
    label: {
      en: 'People with a function in the camp',
      de: 'Personen mit einer Funktion im Lager',
      fr: 'Personnes avec une fonction au camp',
    },
    description: {
      en: 'Everyone holding one of the functions listed under "Funktionen und Adressbuch", e.g. in the Kernteam or a Ressort.',
      de: 'Alle mit einer der Funktionen unter «Funktionen und Adressbuch», z.B. im Kernteam oder in einem Ressort.',
      fr: 'Toutes les personnes ayant une des fonctions de « Funktionen und Adressbuch », p. ex. au Kernteam ou dans un Ressort.',
    },
    condition: whileContactListRestricted,
  },
  contactListIncludesAvp: {
    label: {
      en: 'AVP of every Hof',
      de: 'AVP aller Höfe',
      fr: 'AVP de tous les Höfe',
    },
    description: {
      en: 'The AVP (Abteilungsverantwortliche Person) of each Hof, also for people from other Höfe.',
      de: 'Die AVP (Abteilungsverantwortliche Person) jedes Hofs, auch für Personen aus anderen Höfen.',
      fr: 'L’AVP (Abteilungsverantwortliche Person) de chaque Hof, aussi pour les personnes d’autres Höfe.',
    },
    condition: whileContactListRestricted,
  },
  hideHofAndQuartier: {
    label: 'Hide Hof and Quartier',
    description:
      'Hides the Hof and Quartier sections in the app. This is used for testing purposes.',
  },
  helperShiftsEnabled: {
    label: {
      en: 'Show Helper Shifts (Schichteinsätze)',
      de: 'Schichteinsätze anzeigen',
      fr: 'Afficher les services de helpers',
    },
    description: 'Toggles visibility of the Helper Shifts (Schichteinsätze) menu item in the app.',
  },
  hideFullHelperShifts: {
    label: {
      en: 'Hide Full Helper Slots for Unenrolled Users',
      de: 'Voll ausgebuchte Schichteinsätze für Nicht-Angemeldete ausblenden',
      fr: 'Masquer les services complets pour les personnes non inscrites',
    },
    description: {
      en: 'Toggles hiding full helper slots for users who are not enrolled in them.',
      de: 'Blendet voll ausgebuchte Schichteinsätze für nicht angemeldete Personen aus.',
      fr: 'Masque les services complets pour les personnes non inscrites.',
    },
  },
  imageUploadEnabled: {
    label: {
      en: 'Show Image Upload',
      de: 'Bilder hochladen anzeigen',
      fr: 'Afficher le téléchargement de photos',
    },
    description: 'Toggles visibility of the Image Upload menu item in the app.',
  },
  photoContestEnabled: {
    label: {
      en: 'Show Photo Contest',
      de: 'Foto-Wettbewerb anzeigen',
      fr: 'Afficher le concours photo',
    },
    description: 'Toggles visibility of the Photo Contest menu item in the app.',
  },
  reservationsEnabled: {
    label: {
      en: 'Show Reservations',
      de: 'Reservationen anzeigen',
      fr: 'Afficher les réservations',
    },
    description: 'Toggles visibility of the Reservations menu item in the app.',
  },
  forumEnabled: {
    label: {
      en: 'Show conveniat27 Forum',
      de: 'conveniat27 Forum anzeigen',
      fr: 'Afficher le forum conveniat27',
    },
    description: 'Toggles visibility of the conveniat27 Forum menu item in the app.',
  },
  forumModerationRequired: {
    label: {
      en: 'Forum: approve posts before they are published, in every topic',
      de: 'Forum: Beiträge vor Veröffentlichung freigeben, in allen Themen',
      fr: 'Forum : approuver les publications avant leur parution, dans tous les thèmes',
    },
    description: {
      en: 'Against spam, for every topic at once. While on, a new forum post is seen only by its author and the moderators (the Kernteam of its topic and the piket on duty) until one of them approves it. Posts by the Kernteam need no approval, comments are never held back. A single topic is switched in its settings under Forum Topics.',
      de: 'Gegen Spam, für alle Themen auf einmal. Solange eingeschaltet, sehen einen neuen Beitrag nur die Person, die ihn geschrieben hat, und die Moderation (das Kernteam des Themas und das Piket im Dienst), bis jemand davon ihn freigibt. Beiträge des Kernteams brauchen keine Freigabe, Kommentare werden nie zurückgehalten. Ein einzelnes Thema wird in seinen Einstellungen unter Forum-Themen geschaltet.',
      fr: 'Contre le spam, pour tous les thèmes à la fois. Tant que c’est activé, une nouvelle publication n’est visible que par son auteur et la modération (l’équipe centrale du thème et le piquet de service) jusqu’à ce que quelqu’un l’approuve. Les publications de l’équipe centrale n’ont pas besoin d’approbation, les commentaires ne sont jamais retenus. Un thème seul se règle dans ses réglages sous Thèmes du forum.',
    },
  },
  voiceCallsEnabled: {
    label: {
      en: 'Voice calls in one-to-one chats (prototype)',
      de: 'Anrufe in Einzelchats (Prototyp)',
      fr: 'Appels dans les discussions à deux (prototype)',
    },
    description: {
      en: 'A prototype: two people can call each other from their one-to-one chat.',
      de: 'Ein Prototyp: Zwei Personen können sich aus ihrem Einzelchat anrufen.',
      fr: 'Un prototype : deux personnes peuvent s’appeler depuis leur discussion à deux.',
    },
  },
};

const flagField = (name: FeatureFlagName): CheckboxField => {
  const { label, description, condition } = flagFieldTexts[name];
  return {
    name,
    label,
    type: 'checkbox',
    defaultValue: featureFlags[name].default,
    admin: {
      description,
      ...(condition === undefined ? {} : { condition }),
      components: {
        Field:
          '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
      },
    },
  };
};

/** This replica applies a save at once; the others pick it up at their next reload. */
const applySavedFlags: GlobalAfterChangeHook = ({ doc }): void => {
  rememberSavedFeatureFlags(doc as Record<string, unknown>);
};

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
    afterChange: [applySavedFlags, flushPageCacheOnChangeGlobal],
  },
  fields: (Object.keys(flagFieldTexts) as FeatureFlagName[]).map((name) => flagField(name)),
};
