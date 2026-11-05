import { environmentVariables } from '@/config/environment-variables';
import { ROLE_LABELS } from '@/features/payload-cms/payload-cms/access-rules/role-labels';
import { Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { Tab } from 'payload';

/**
 * The tab where an editor picks who a channel is for: everyone, roles, Cevi.DB groups or the
 * AVPs, with a count of the people the selection reaches. The audience fields keep these names,
 * since `ChannelAudience` and the membership sync read them.
 */
export const audienceTab = (): Tab => ({
  label: { en: 'Audience', de: 'Zielgruppe', fr: 'Public cible' },
  admin: {
    description: {
      en: 'Who is added to the channel. Saving updates the members right away.',
      de: 'Wer in den Kanal aufgenommen wird. Beim Speichern werden die Mitglieder sofort angepasst.',
      fr: 'Qui est ajouté au canal. L’enregistrement met les membres à jour immédiatement.',
    },
  },
  fields: [
    {
      name: 'targetType',
      label: {
        en: 'Target Group Type',
        de: 'Zielgruppentyp',
        fr: 'Type de groupe cible',
      },
      type: 'select',
      required: true,
      defaultValue: 'all',
      options: [
        {
          label: { en: 'All Users', de: 'Alle Benutzer', fr: 'Tous les utilisateurs' },
          value: 'all',
        },
        {
          label: {
            en: 'Specific Roles',
            de: 'Spezifische Rollen',
            fr: 'Rôles spécifiques',
          },
          value: 'roles',
        },
        {
          label: { en: 'Cevi.DB groups', de: 'Cevi.DB-Gruppen', fr: 'Groupes Cevi.DB' },
          value: 'cevi_groups',
        },
        {
          label: { en: 'All AVPs', de: 'Alle AVPs', fr: 'Tous les AVP' },
          value: 'avps',
        },
      ],
      // the AVPs are found through the Höfe, which only the Hof dashboard keeps
      filterOptions: ({ options }) =>
        environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD
          ? options
          : options.filter(
              (option) => (typeof option === 'string' ? option : option.value) !== 'avps',
            ),
    },
    {
      name: 'targetRoles',
      label: {
        en: 'Target Roles',
        de: 'Zielrollen',
        fr: 'Rôles cibles',
      },
      type: 'select',
      hasMany: true,
      options: Object.values(Roles).map((role) => ({
        label: ROLE_LABELS[role],
        value: role,
      })),
      admin: {
        condition: (data) => data['targetType'] === 'roles',
      },
    },
    {
      name: 'targetCeviGroups',
      label: {
        en: 'Target Cevi.DB groups',
        de: 'Ziel-Cevi.DB-Gruppen',
        fr: 'Groupes Cevi.DB cibles',
      },
      labels: {
        singular: { en: 'Cevi.DB group', de: 'Cevi.DB-Gruppe', fr: 'Groupe Cevi.DB' },
        plural: { en: 'Cevi.DB groups', de: 'Cevi.DB-Gruppen', fr: 'Groupes Cevi.DB' },
      },
      type: 'array',
      admin: {
        condition: (data) => data['targetType'] === 'cevi_groups',
        description: {
          en: 'Everyone who is in one of these groups in Cevi.DB. Pick a group by its name or type its ID.',
          de: 'Alle, die in der Cevi.DB in einer dieser Gruppen sind. Wähle eine Gruppe über ihren Namen aus oder gib ihre ID ein.',
          fr: "Toutes les personnes membres d'un de ces groupes dans Cevi.DB. Choisis un groupe par son nom ou saisis son ID.",
        },
        components: {
          RowLabel:
            '@/features/payload-cms/payload-cms/components/chat-channel/cevi-group-row-label#CeviGroupRowLabel',
        },
      },
      fields: [
        {
          name: 'groupId',
          label: { en: 'Cevi.DB group', de: 'Cevi.DB-Gruppe', fr: 'Groupe Cevi.DB' },
          type: 'number',
          required: true,
          admin: {
            components: {
              Field:
                '@/features/payload-cms/payload-cms/components/chat-channel/cevi-group-picker#CeviGroupPicker',
            },
          },
        },
        {
          // filled in by the picker; only shown so a group typed in by its ID can be named
          name: 'groupName',
          label: { en: 'Group Name', de: 'Gruppenname', fr: 'Nom du groupe' },
          type: 'text',
        },
      ],
    },
    {
      name: 'audiencePreview',
      type: 'ui',
      admin: {
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/chat-channel/audience-preview#AudiencePreview',
        },
        disableListColumn: true,
      },
    },
  ],
});
