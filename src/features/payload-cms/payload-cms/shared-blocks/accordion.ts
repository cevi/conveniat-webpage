import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { formBlock } from '@/features/payload-cms/payload-cms/shared-blocks/form-block';
import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical';
import type { Block, Field } from 'payload';

const plainTextBlock: Block = {
  slug: 'accordionPlainTextBlock',
  interfaceName: 'PlainTextBlock',
  fields: [
    {
      name: 'value',
      label: 'Value',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: [...minimalEditorFeatures],
        lexical: defaultEditorLexicalConfig,
      }),
      hooks: patchRichTextLinkHook,
    },
  ],
};

const teamLeaderGroup: Field = {
  name: 'teamLeaderGroup',
  label: {
    de: 'Teamleiter*in',
    en: 'Team Leader',
    fr: "Chef d'équipe",
  },
  type: 'group',
  fields: [
    {
      name: 'name',
      label: {
        de: 'Name des Teamleiters',
        en: 'Name of the Team Leader',
        fr: "Nom du chef d'équipe",
      },
      type: 'text',
      required: true,
    },
    {
      name: 'ceviname',
      label: {
        de: 'Cevi-Name des Teamleiters',
        en: 'Cevi Name of the Team Leader',
        fr: "Nom Cevi du chef d'équipe",
      },
      type: 'text',
      defaultValue: '',
      required: false,
    },
    {
      name: 'portrait',
      label: {
        de: 'Portrait des Teamleiters',
        en: 'Portrait of the Team Leader',
        fr: "Portrait du chef d'équipe",
      },
      type: 'upload',
      relationTo: 'images',
      required: false,
    },
  ],
};

const teamMembersBlock: Block = {
  slug: 'accordionTeamMembersBlock',
  interfaceName: 'TeamMembersBlock',
  fields: [
    LinkField(false),
    teamLeaderGroup,
    {
      name: 'teamMembers',
      label: {
        de: 'Teammitglieder',
        en: 'Team Members',
        fr: 'Membres de l’équipe',
      },
      type: 'array',
      required: false,
      fields: [
        {
          name: 'name',
          label: {
            de: 'Name',
            en: 'Name',
            fr: 'Nom',
          },
          type: 'text',
          required: true,
        },
        {
          name: 'ceviname',
          label: {
            de: 'Cevi-Name',
            en: 'Cevi Name',
            fr: 'Nom UCS',
          },
          type: 'text',
          required: false,
        },
        {
          name: 'function',
          label: {
            de: 'Funktion',
            en: 'Function',
            fr: 'Fonction',
          },
          type: 'text',
          required: true,
        },
      ],
    },
  ],
};

export const accordion: Block = {
  slug: 'accordion',
  interfaceName: 'AccordionBlocks',

  imageURL: '/admin-block-images/accordion-block.png',
  imageAltText: 'Accordion Block',

  fields: [
    {
      name: 'introduction',
      type: 'richText',
      label: {
        de: 'Einleitungstext',
        en: 'Introduction Text',
        fr: "Texte d'introduction",
      },
      editor: lexicalEditor({
        features: [
          ...minimalEditorFeatures,
          HeadingFeature({
            enabledHeadingSizes: ['h2', 'h3'],
          }),
          UnorderedListFeature(),
        ],
        lexical: defaultEditorLexicalConfig,
      }),
      hooks: patchRichTextLinkHook,
    },

    {
      type: 'array',
      name: 'accordionBlocks',
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: {
            path: '@/features/payload-cms/payload-cms/components/accordion-row-label#AccordionArrayRowLabel',
          },
        },
      },
      minRows: 1,
      fields: [
        {
          name: 'titleOrPortrait',
          label: {
            de: 'Titel oder Portrait',
            en: 'Title or Portrait',
            fr: 'Titre ou portrait',
          },
          type: 'radio',
          required: true,
          options: [
            {
              label: {
                de: 'Titel',
                en: 'Title',
                fr: 'Titre',
              },
              value: 'title',
            },
            {
              label: {
                de: 'Portrait',
                en: 'Portrait',
                fr: 'Portrait',
              },
              value: 'portrait',
            },
          ],
          admin: {
            description: {
              de: 'Wählen Sie, ob der Titel oder ein Portrait in der miniaturisierten Ansicht angezeigt werden soll.',
              en: 'Choose whether to display the title or a portrait in the miniaturized view.',
              fr: 'Choisissez d’afficher le titre ou un portrait dans la vue miniaturisée.',
            },
          },
        },
        {
          name: 'title',
          label: {
            de: 'Titel des Akkordeonblocks',
            en: 'Title of the Accordion Block',
            fr: 'Titre du bloc accordéon',
          },
          admin: {
            description: {
              de: 'Dies ist der Titel des Akkordeonblocks. Er wird in der Übersicht angezeigt, und wenn er angeklickt wird, wird der Block erweitert.',
              en: 'This is the title of the accordion block. It will be displayed in the overview, and when clicked, the block will expand.',
              fr: "Ceci est le titre du bloc accordéon. Il sera affiché dans l'aperçu, et lorsqu'il est cliqué, le bloc se développera.",
            },
            condition: (_, siblingData) => siblingData['titleOrPortrait'] === 'title',
          },
          type: 'text',
          required: true,
        },
        {
          ...teamLeaderGroup,
          admin: {
            condition: (_, siblingData) => siblingData['titleOrPortrait'] === 'portrait',
          },
        },
        {
          name: 'valueBlocks',
          label: {
            de: 'Inhalt des Akkordeonblocks',
            en: 'Content of the Accordion Block',
            fr: 'Contenu du bloc accordéon',
          },
          admin: {
            initCollapsed: true,
            description: {
              de: 'Dies ist der Inhalt des Akkordeonblocks. Er wird angezeigt, wenn der Block erweitert wird.',
              en: 'This is the content of the accordion block. It will be displayed when the block is expanded.',
              fr: 'Ceci est le contenu du bloc accordéon. Il sera affiché lorsque le bloc sera développé.',
            },
          },
          type: 'blocks',
          required: true,
          blocks: [plainTextBlock, teamMembersBlock, formBlock],
        },
      ],
    },
  ],
};
