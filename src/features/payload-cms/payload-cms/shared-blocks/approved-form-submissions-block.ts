import { filterOptionsOnlyPublished } from '@/features/payload-cms/payload-cms/utils/filter-options-only-published';
import type { Block } from 'payload';

export const approvedFormSubmissionsBlock: Block = {
  slug: 'approvedFormSubmissionsBlock',
  interfaceName: 'ApprovedFormSubmissionsBlock',

  imageURL: '/admin-block-images/form-block.png',
  imageAltText: 'Approved Form Submissions block',

  labels: {
    singular: {
      de: 'Freigegebene Formular-Antworten',
      en: 'Approved Form Submissions',
      fr: 'Soumissions de formulaires approuvées',
    },
    plural: {
      de: 'Freigegebene Formular-Antworten',
      en: 'Approved Form Submissions',
      fr: 'Soumissions de formulaires approuvées',
    },
  },

  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      hasMany: false,
      filterOptions: filterOptionsOnlyPublished,
      label: {
        de: 'Formular',
        en: 'Form',
        fr: 'Formulaire',
      },
    },
    {
      name: 'heading',
      type: 'text',
      localized: true,
      label: {
        de: 'Überschrift',
        en: 'Heading',
        fr: 'Titre',
      },
      admin: {
        description: {
          de: 'Optionale Überschrift (z.B. "Bereits angemeldete Stände")',
          en: 'Optional heading (e.g. "Registered Stands")',
          fr: 'Titre optionnel',
        },
      },
    },
    {
      name: 'titleFieldName',
      type: 'text',
      required: false,
      defaultValue: 'name_des_standes',
      label: {
        de: 'Feldname für den Titel',
        en: 'Title Field Name',
        fr: 'Nom du champ titre',
      },
      admin: {
        description: {
          de: 'Name des Formularfelds, das als Haupttitel angezeigt werden soll (z.B. name_des_standes oder title).',
          en: 'Name of the form field to display as main title (e.g. name_des_standes or title).',
          fr: 'Nom du champ de formulaire à afficher comme titre principal.',
        },
      },
    },
    {
      name: 'categoryFieldName',
      type: 'text',
      required: false,
      defaultValue: 'kategorie',
      label: {
        de: 'Feldname für die Kategorie',
        en: 'Category Field Name',
        fr: 'Nom du champ catégorie',
      },
      admin: {
        description: {
          de: 'Name des Formularfelds, das für die Kategoriesuche/Filterung verwendet werden soll (z.B. kategorie).',
          en: 'Name of the form field to use for category search/filtering (e.g. kategorie).',
          fr: 'Nom du champ de formulaire pour le filtrage par catégorie.',
        },
      },
    },
    {
      name: 'fileFieldName',
      type: 'text',
      required: false,
      defaultValue: 'konzept',
      label: {
        de: 'Feldname für PDF/Datei-Download',
        en: 'PDF/File Field Name',
        fr: 'Nom du champ PDF/Fichier',
      },
      admin: {
        description: {
          de: 'Name des Formularfelds für hochgeladene PDFs oder Konzepte (z.B. konzept).',
          en: 'Name of the form field for uploaded PDFs or documents (e.g. konzept).',
          fr: 'Nom du champ de formulaire pour les PDF ou documents téléchargés.',
        },
      },
    },
    {
      name: 'displayFields',
      type: 'array',
      label: {
        de: 'Anzuzeigende Detailfelder',
        en: 'Detail Fields to Display',
        fr: 'Champs détaillés à afficher',
      },
      admin: {
        description: {
          de: 'Wähle spezifische Formularfelder aus, die beim Aufklappen der Details dynamisch angezeigt werden sollen.',
          en: 'Select specific form fields to display dynamically when expanding submission details.',
          fr: 'Sélectionnez les champs spécifiques à afficher dynamiquement.',
        },
        initCollapsed: false,
      },
      fields: [
        {
          name: 'fieldName',
          type: 'text',
          required: true,
          label: {
            de: 'Feld-Schlüssel (Technical Name)',
            en: 'Field Name (Key)',
            fr: 'Nom du champ (Clé)',
          },
          admin: {
            description: {
              de: 'z.B. name_vom_hof, stand_grosse, ressourcen, programmdauer',
              en: 'e.g. name_vom_hof, stand_grosse, ressourcen, programmdauer',
              fr: 'ex. name_vom_hof, stand_grosse, ressourcen, programmdauer',
            },
          },
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          label: {
            de: 'Anzeigename / Label',
            en: 'Display Label',
            fr: 'Libellé d’affichage',
          },
          admin: {
            description: {
              de: 'Lesbarer Titel für dieses Feld (z.B. "Hof", "Standgrösse")',
              en: 'Human readable label (e.g. "Farm/Group", "Stand size")',
              fr: 'Libellé lisible',
            },
          },
        },
      ],
    },
  ],
};
