import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { fileDownloadBlock } from '@/features/payload-cms/payload-cms/shared-blocks/file-download-block';
import { formBlock } from '@/features/payload-cms/payload-cms/shared-blocks/form-block';
import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import {
  defaultEditorLexicalConfig,
  lexicalEditor,
  OrderedListFeature,
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
        features: [...minimalEditorFeatures, UnorderedListFeature(), OrderedListFeature()],
        lexical: defaultEditorLexicalConfig,
      }),
      hooks: patchRichTextLinkHook,
    },
    {
      name: 'showVerticalSeparator',
      label: {
        de: 'Vertikale Trennlinie nach Block anzeigen',
        en: 'Show vertical separator after block',
        fr: 'Afficher le séparateur vertical après le bloc',
      },
      type: 'checkbox',
      defaultValue: true,
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

const accordionTimelineElement: Block = {
  slug: 'accordionTimelineElement',
  interfaceName: 'AccordionTimelineElementBlock',
  labels: {
    singular: {
      de: 'Timeline Element',
      en: 'Timeline Element',
      fr: 'Élément de la chronologie',
    },
    plural: {
      de: 'Timeline Elemente',
      en: 'Timeline Elements',
      fr: 'Éléments de la chronologie',
    },
  },
  fields: [
    {
      name: 'dateText',
      label: {
        de: 'Datum / Schritt',
        en: 'Date / Step',
        fr: 'Date / Étape',
      },
      type: 'text',
      required: true,
    },
    {
      name: 'title',
      label: {
        de: 'Titel',
        en: 'Title',
        fr: 'Titre',
      },
      type: 'text',
      required: true,
    },
    {
      name: 'contentBlocks',
      label: {
        de: 'Inhalt',
        en: 'Content',
        fr: 'Contenu',
      },
      type: 'blocks',
      required: false,
      blocks: [plainTextBlock, teamMembersBlock, formBlock, fileDownloadBlock],
    },
  ],
};

const nestedAccordion: Block = {
  slug: 'nestedAccordion',
  interfaceName: 'NestedAccordionBlocks',
  fields: [
    {
      type: 'array',
      name: 'accordionBlocks',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'valueBlocks',
          type: 'blocks',
          required: true,
          blocks: [
            plainTextBlock,
            teamMembersBlock,
            formBlock,
            fileDownloadBlock,
            accordionTimelineElement,
          ],
        },
      ],
    },
  ],
};

const valueBlocks: Block[] = [
  plainTextBlock,
  teamMembersBlock,
  formBlock,
  accordionTimelineElement,
  nestedAccordion,
  fileDownloadBlock,
];

export const accordion: Block = {
  slug: 'accordion',
  interfaceName: 'AccordionBlocks',

  imageURL: '/admin-block-images/accordion-block.png',
  imageAltText: 'Accordion Block',

  fields: [
    {
      name: 'enableSearch',
      label: {
        de: 'Suchleiste aktivieren',
        en: 'Enable Search Bar',
        fr: 'Activer la barre de recherche',
      },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: {
          de: 'Zeigt eine Suchleiste über den Akkordeonblöcken an. Benutzer können die Blöcke nach Titel, Inhalt und Schlüsselwörtern filtern.',
          en: 'Shows a search bar above the accordion blocks. Users can filter blocks by title, content, and keywords.',
          fr: 'Affiche une barre de recherche au-dessus des blocs accordéon. Les utilisateurs peuvent filtrer les blocs par titre, contenu et mots-clés.',
        },
      },
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
              fr: "Choisissez d'afficher le titre ou un portrait dans la vue miniaturisée.",
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
          name: 'searchKeywords',
          label: {
            de: 'Suchbegriffe (optional)',
            en: 'Search Keywords (optional)',
            fr: 'Mots-clés de recherche (optionnel)',
          },
          type: 'text',
          required: false,
          admin: {
            description: {
              de: 'Optionale Schlüsselwörter, die die Auffindbarkeit dieses Eintrags in der Suchleiste verbessern. Wird nur verwendet, wenn die Suchleiste für diesen Akkordeonblock aktiviert ist.',
              en: 'Optional keywords to improve the discoverability of this entry in the search bar. Only used when the search bar is enabled for this accordion block.',
              fr: 'Mots-clés optionnels pour améliorer la visibilité de cet entrée dans la barre de recherche. Utilisé uniquement si la barre de recherche est activée pour ce bloc accordéon.',
            },
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
          blocks: valueBlocks,
        },
      ],
    },
  ],
};
