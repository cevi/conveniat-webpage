import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

/**
 * Places the Spendenbarometer on a page.
 *
 * The block carries only the words that belong to this one placement. The goal
 * and the amount raised come from the `donation-barometer` global, so the same
 * figure appears wherever the block is used and only has to be corrected once.
 */
export const donationBarometerBlock: Block = {
  slug: 'donationBarometer',
  interfaceName: 'DonationBarometerBlock',
  imageAltText: 'Donation Barometer block',
  labels: {
    singular: {
      de: 'Spendenbarometer',
      en: 'Donation Barometer',
      fr: 'Baromètre des dons',
    },
    plural: {
      de: 'Spendenbarometer',
      en: 'Donation Barometers',
      fr: 'Baromètres des dons',
    },
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: {
        de: 'Überzeile (z.B. Gemeinsam ans Ziel)',
        en: 'Eyebrow (e.g. Together to the summit)',
        fr: 'Surtitre (par ex. Ensemble vers le sommet)',
      },
      admin: {
        description: {
          de: 'Spendenstand und Ziel pflegst du unter «Spendenbarometer» in den Seiten-Einstellungen — sie gelten für alle Seiten und werden nicht hier gesetzt.',
          en: 'The amount raised and the goal are maintained under "Donation Barometer" in the page settings — they apply to every page and are not set here.',
          fr: 'Le montant récolté et l’objectif se gèrent sous « Baromètre des dons » dans les réglages des pages : ils valent pour toutes les pages et ne se définissent pas ici.',
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: {
        de: 'Titel',
        en: 'Title',
        fr: 'Titre',
      },
      admin: {
        description: {
          de: 'Nenne das Ziel, nicht das Barometer: «Damit jedes Kind mitkommt» trägt weiter als «Spendenstand».',
          en: 'Name the goal, not the barometer: "So every child can come along" carries further than "Donation status".',
          fr: 'Nomme l’objectif, pas le baromètre : « Pour que chaque enfant puisse venir » porte plus loin que « État des dons ».',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: {
        de: 'Beschreibungstext',
        en: 'Description text',
        fr: 'Texte de description',
      },
    },
    {
      name: 'buttonLabel',
      type: 'text',
      label: {
        de: 'Button-Text (z.B. Jetzt mithelfen)',
        en: 'Button label (e.g. Help us get there)',
        fr: 'Texte du bouton (par ex. Aide-nous à y arriver)',
      },
      admin: {
        description: {
          de: 'Leer lassen, wenn das Barometer neben einem separaten Spenden-Aufruf steht.',
          en: 'Leave empty when the barometer sits next to a separate donation call-to-action.',
          fr: 'Laisse vide si le baromètre accompagne un appel aux dons distinct.',
        },
      },
    },
    // Optional, like the button label above it: a barometer is also useful as a
    // pure status panel beside a separate donation call-to-action.
    LinkField(false),
  ],
};
