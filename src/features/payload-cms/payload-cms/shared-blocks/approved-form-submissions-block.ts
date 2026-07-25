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
      name: 'centerHorizontally',
      type: 'checkbox',
      defaultValue: false,
      label: {
        de: 'Horizontal zentrieren',
        en: 'Center Horizontally',
        fr: 'Centrer horizontalement',
      },
      admin: {
        description: {
          de: 'Aktivieren, um diesen Block auf der Seite horizontal zu zentrieren.',
          en: 'Enable to center this block horizontally on the page.',
          fr: 'Activer pour centrer ce bloc horizontalement sur la page.',
        },
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
          de: 'Optionale Überschrift (z.B. "Bereits angemeldete Stände", "Freigegebene Beiträge")',
          en: 'Optional heading (e.g. "Registered Stands", "Approved Submissions")',
          fr: 'Titre optionnel',
        },
      },
    },
    {
      name: 'titleFieldName',
      type: 'text',
      required: false,
      defaultValue: 'title',
      label: {
        de: 'Feldname für den Titel',
        en: 'Title Field Name',
        fr: 'Nom du champ titre',
      },
      admin: {
        description: {
          de: 'Name des Formularfelds für den Haupttitel (z.B. title, name_des_standes, name_vom_hof).',
          en: 'Name of the form field to display as main title (e.g. title, name_des_standes).',
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
          de: 'Name des Formularfelds für die Kategoriesuche/Filterung (z.B. kategorie, category).',
          en: 'Name of the form field to use for category search/filtering (e.g. kategorie, category).',
          fr: 'Nom du champ de formulaire pour le filtrage par catégorie.',
        },
      },
    },
    {
      name: 'fileFieldName',
      type: 'text',
      required: false,
      defaultValue: 'file',
      label: {
        de: 'Feldname für PDF/Datei-Download',
        en: 'PDF/File Field Name',
        fr: 'Nom du champ PDF/Fichier',
      },
      admin: {
        description: {
          de: 'Name des Formularfelds für hochgeladene PDFs/Dateien (z.B. konzept, file, pdf).',
          en: 'Name of the form field for uploaded PDFs or documents (e.g. konzept, file, pdf).',
          fr: 'Nom du champ de formulaire pour les PDF ou documents téléchargés.',
        },
      },
    },
    {
      name: 'searchPlaceholder',
      type: 'text',
      localized: true,
      label: {
        de: 'Benutzerdefinierter Such-Platzhalter',
        en: 'Custom Search Placeholder',
        fr: 'Espace réservé de recherche personnalisé',
      },
      admin: {
        description: {
          de: 'Optionaler Text für das Suchfeld (z.B. "Stände oder Konzepte durchsuchen...")',
          en: 'Optional placeholder for the search input (e.g. "Search entries...")',
          fr: 'Texte optionnel pour le champ de recherche',
        },
      },
    },
    {
      name: 'fileDownloadButtonLabel',
      type: 'text',
      localized: true,
      label: {
        de: 'Benutzerdefinierter Download-Button Text',
        en: 'Custom Download Button Text',
        fr: 'Texte du bouton de téléchargement personnalisé',
      },
      admin: {
        description: {
          de: 'Optionaler Text für den Download-Button (z.B. "Konzept / PDF herunterladen")',
          en: 'Optional label for the file download button (e.g. "Download Concept (PDF)")',
          fr: 'Texte optionnel pour le bouton de téléchargement',
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
