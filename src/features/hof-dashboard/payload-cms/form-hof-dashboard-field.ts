import { environmentVariables } from '@/config/environment-variables';
import { areaOptions, entryModeOptions } from '@/features/hof-dashboard/payload-cms/options';
import { getFormBlockNames } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { Field, SelectFieldSingleValidation, TextFieldSingleValidation } from 'payload';

/** Whether a form asks for the Hof, which is what links a submission to a Hof's dashboard. */
const asksForHof = (sections: unknown): boolean =>
  Array.isArray(sections) &&
  sections.some((section: { formSection?: { fields?: unknown[] | null } } | null) =>
    getFormBlockNames(section?.formSection?.fields, 'hofSelection').some(Boolean),
  );

const requiresHofSelection: SelectFieldSingleValidation = (value, { data, req }) =>
  value === null ||
  value === undefined ||
  asksForHof((data as { sections?: unknown }).sections) ||
  getValidationMessage(req.i18n.language, {
    en: 'Add a "Hof Selection" field to the form first: it tells which Hof a submission belongs to.',
    de: 'Zuerst ein Feld "Hof Auswahl" ins Formular einfügen: Es sagt, zu welchem Hof eine Antwort gehört.',
    fr: 'Ajoute d’abord un champ « Sélection du Hof » au formulaire : il indique à quel Hof une réponse appartient.',
  });

/** Every field name of a form, conditioned fields included. */
const fieldNamesOf = (sections: unknown): string[] => {
  const collect = (fields: unknown): string[] =>
    Array.isArray(fields)
      ? fields.flatMap((field: { name?: unknown; fields?: unknown } | null) => [
          ...(typeof field?.name === 'string' ? [field.name] : []),
          ...collect(field?.fields),
        ])
      : [];
  return Array.isArray(sections)
    ? sections.flatMap((section: { formSection?: { fields?: unknown } } | null) =>
        collect(section?.formSection?.fields),
      )
    : [];
};

const isFieldOfForm: TextFieldSingleValidation = (value, { data, req }) =>
  value === null ||
  value === undefined ||
  value === '' ||
  fieldNamesOf((data as { sections?: unknown }).sections).includes(value) ||
  getValidationMessage(req.i18n.language, {
    en: 'No field of this form has this name. Use the name of a field, e.g. "name".',
    de: 'Kein Feld dieses Formulars hat diesen Namen. Den Namen eines Feldes angeben, z.B. "name".',
    fr: 'Aucun champ de ce formulaire ne porte ce nom. Indique le nom d’un champ, p. ex. « name ».',
  });

const isOnDashboard = (_: unknown, siblingData: Record<string, unknown>): boolean =>
  typeof siblingData['area'] === 'string' && siblingData['area'] !== '';

/**
 * Links a form to the Hof dashboard, next to the workflows a form triggers. A form with an
 * area shows on the dashboard of every Hof, with that Hof's submissions, and the Hof hands it
 * in right there, its Hof filled in.
 */
export const formHofDashboardField: Field = {
  name: 'hofDashboard',
  type: 'group',
  label: { en: 'Hof dashboard', de: 'Hof-Dashboard', fr: 'Tableau de bord du Hof' },
  admin: {
    // it links to the Hof dashboard; a deployment without it has nothing to link to
    hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
    description: {
      en: 'Shows this form on the dashboard of every Hof, with that Hof’s submissions. The Ressort answers each submission in its sidebar.',
      de: 'Zeigt dieses Formular auf dem Dashboard jedes Hofs, mit den Antworten dieses Hofs. Das Ressort beantwortet jede Antwort in ihrer Seitenleiste.',
      fr: 'Affiche ce formulaire sur le tableau de bord de chaque Hof, avec les réponses de ce Hof. Le Ressort répond à chaque réponse dans sa barre latérale.',
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'area',
          type: 'select',
          options: areaOptions,
          validate: requiresHofSelection,
          label: { en: 'Area', de: 'Bereich', fr: 'Domaine' },
          admin: {
            width: '50%',
            description: {
              en: 'The tab it shows under. Leave empty to keep the form off the dashboard.',
              de: 'Der Reiter, unter dem es erscheint. Leer lassen, damit das Formular nicht auf dem Dashboard erscheint.',
              fr: 'L’onglet sous lequel il apparaît. Laisser vide pour ne pas l’afficher sur le tableau de bord.',
            },
          },
        },
        {
          name: 'entries',
          type: 'select',
          options: entryModeOptions,
          defaultValue: 'versions',
          required: true,
          label: { en: 'Submissions', de: 'Antworten', fr: 'Réponses' },
          admin: { width: '50%', condition: isOnDashboard },
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      label: { en: 'Title on the dashboard', de: 'Titel im Dashboard', fr: 'Titre sur le tableau' },
      admin: {
        condition: isOnDashboard,
        description: {
          en: 'E.g. "Hof buildings". Without one, the dashboard uses the internal form title.',
          de: 'Z.B. "Hofbauten". Ohne Titel nimmt das Dashboard den internen Formulartitel.',
          fr: 'P. ex. « Constructions du Hof ». Sans titre, le tableau reprend le titre interne.',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      label: { en: 'Short description', de: 'Kurzbeschreibung', fr: 'Description courte' },
      admin: { condition: isOnDashboard },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'deadline',
          type: 'date',
          label: { en: 'Due', de: 'Abgabe bis', fr: 'À rendre le' },
          admin: {
            width: '50%',
            condition: isOnDashboard,
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
          },
        },
        {
          name: 'closesAtDeadline',
          type: 'checkbox',
          label: {
            en: 'Closes after the due date',
            de: 'Nach der Abgabe geschlossen',
            fr: 'Fermé après l’échéance',
          },
          admin: {
            width: '50%',
            condition: isOnDashboard,
            description: {
              en: 'E.g. for a material order. The Höfe still see what they sent; the web team can still hand it in for them.',
              de: 'Z.B. für eine Materialbestellung. Die Höfe sehen ihre Antworten weiterhin; das Web-Team kann noch für sie abgeben.',
              fr: 'P. ex. pour une commande de matériel. Les Hofs voient encore leurs réponses ; l’équipe web peut encore déposer pour eux.',
            },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'titleField',
          type: 'text',
          validate: isFieldOfForm,
          label: {
            en: 'Field that names an entry',
            de: 'Feld, das einen Eintrag benennt',
            fr: 'Champ qui nomme une entrée',
          },
          admin: {
            width: '50%',
            condition: isOnDashboard,
            description: {
              en: 'Optional field name, e.g. "name" for the name of a stand.',
              de: 'Optionaler Feldname, z.B. "name" für den Namen eines Standes.',
              fr: 'Nom de champ facultatif, p. ex. « name » pour le nom d’un stand.',
            },
          },
        },
        {
          name: 'onlyHofAdministrators',
          type: 'checkbox',
          defaultValue: true,
          label: {
            en: 'Only the Hof’s address administrators may hand it in',
            de: 'Nur die Adressverwaltung des Hofs darf abgeben',
            fr: 'Seule la gestion des adresses du Hof peut déposer',
          },
          admin: {
            width: '50%',
            condition: isOnDashboard,
            description: {
              en: 'Off: anyone signed in can hand it in for any Hof, as the Stadtleben stand registration always allowed. Leave it on for plans and orders.',
              de: 'Aus: Alle Angemeldeten können es für jeden Hof abgeben, wie bisher die Standanmeldung fürs Stadtleben. Für Planungen und Bestellungen eingeschaltet lassen.',
              fr: 'Désactivé : toute personne connectée peut le déposer pour n’importe quel Hof, comme l’inscription des stands du Stadtleben jusqu’ici. Le laisser activé pour les plans et les commandes.',
            },
          },
        },
      ],
    },
    {
      name: 'publishApprovedFiles',
      type: 'checkbox',
      defaultValue: false,
      label: {
        en: 'Files of approved submissions are public',
        de: 'Dateien freigegebener Abgaben sind öffentlich',
        fr: 'Les fichiers des dépôts approuvés sont publics',
      },
      admin: {
        condition: isOnDashboard,
        description: {
          en: 'On: once a submission is approved, anyone can download its files without signing in, e.g. the concept of a Stadtleben stand the website shows. Leave it off for plans and orders: approving them only accepts them.',
          de: 'Ein: Sobald eine Abgabe freigegeben ist, kann jede Person ihre Dateien ohne Anmeldung herunterladen, z.B. das Konzept eines Stadtleben-Standes, den die Website zeigt. Für Planungen und Bestellungen ausgeschaltet lassen: Freigeben heisst dort nur akzeptieren.',
          fr: 'Activé : dès qu’un dépôt est approuvé, tout le monde peut télécharger ses fichiers sans se connecter, p. ex. le concept d’un stand du Stadtleben que le site affiche. Le laisser désactivé pour les plans et les commandes : les approuver revient seulement à les accepter.',
        },
      },
    },
    {
      name: 'position',
      type: 'number',
      label: { en: 'Position', de: 'Reihenfolge', fr: 'Ordre' },
      admin: {
        condition: isOnDashboard,
        description: {
          en: 'Lower numbers show first within their area.',
          de: 'Kleinere Zahlen erscheinen in ihrem Bereich zuerst.',
          fr: 'Les nombres plus petits apparaissent en premier dans leur domaine.',
        },
      },
    },
  ],
};
