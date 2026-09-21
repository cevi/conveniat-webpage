import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

/**
 * A prominent donation call-to-action.
 *
 * The block deliberately links out to the payment provider (e.g. a RaiseNow
 * Paylink such as https://donate.raisenow.io/cprdt) instead of embedding the
 * donation form in an iframe: TWINT, 3-D Secure and Apple Pay all rely on a
 * top-level navigation or app switch, and RaiseNow disables Apple Pay for
 * embedded forms altogether.
 */
export const donationCtaBlock: Block = {
  slug: 'donationCta',
  interfaceName: 'DonationCtaBlock',
  imageAltText: 'Donation Call-To-Action block',
  labels: {
    singular: {
      de: 'Spenden-Aufruf',
      en: 'Donation Call-To-Action',
      fr: 'Appel aux dons',
    },
    plural: {
      de: 'Spenden-Aufrufe',
      en: 'Donation Call-To-Actions',
      fr: 'Appels aux dons',
    },
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: {
        de: 'Überzeile (z.B. Unterstütze conveniat27)',
        en: 'Eyebrow (e.g. Support conveniat27)',
        fr: 'Surtitre (par ex. Soutiens conveniat27)',
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
          de: 'Ein Titel, der die Wirkung benennt, trägt weiter als einer, der die Handlung benennt: «Jedem Kind ein Lager ermöglichen» oder «Lagerbeitrag schenken» statt «Jetzt spenden».',
          en: 'A title that names the impact carries further than one that names the action: "Give every child a camp" rather than "Donate now".',
          fr: 'Un titre qui nomme l’impact porte plus loin qu’un titre qui nomme l’action : « Offrir un camp à chaque enfant » plutôt que « Faire un don ».',
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
      required: true,
      label: {
        de: 'Button-Text (z.B. Spenden)',
        en: 'Button label (e.g. Donate)',
        fr: 'Texte du bouton (par ex. Faire un don)',
      },
    },
    LinkField(),
    {
      name: 'paymentMethods',
      type: 'array',
      label: {
        de: 'Zahlungsmittel-Logos',
        en: 'Payment method logos',
        fr: 'Logos des moyens de paiement',
      },
      admin: {
        description: {
          de: 'Optionale Logos (z.B. TWINT, Visa, Mastercard). Lade die offiziellen Logos in die Medienbibliothek und wähle sie hier aus.',
          en: 'Optional logos (e.g. TWINT, Visa, Mastercard). Upload the official logos to the media library and select them here.',
          fr: 'Logos optionnels (par ex. TWINT, Visa, Mastercard). Téléverse les logos officiels dans la médiathèque et sélectionne-les ici.',
        },
      },
      labels: {
        singular: {
          de: 'Zahlungsmittel',
          en: 'Payment method',
          fr: 'Moyen de paiement',
        },
        plural: {
          de: 'Zahlungsmittel',
          en: 'Payment methods',
          fr: 'Moyens de paiement',
        },
      },
      fields: [
        {
          name: 'logo',
          type: 'relationship',
          relationTo: 'images',
          required: true,
          label: {
            de: 'Logo',
            en: 'Logo',
            fr: 'Logo',
          },
        },
      ],
    },
    {
      name: 'note',
      type: 'text',
      label: {
        de: 'Hinweis (Kleingedrucktes unter dem Button)',
        en: 'Note (small print below the button)',
        fr: 'Note (petits caractères sous le bouton)',
      },
      admin: {
        description: {
          de: 'z.B. "Die Zahlung wird sicher über RaiseNow abgewickelt."',
          en: 'e.g. "Payments are processed securely via RaiseNow."',
          fr: 'par ex. « Les paiements sont traités en toute sécurité via RaiseNow. »',
        },
      },
    },
    {
      name: 'variant',
      type: 'select',
      required: true,
      defaultValue: 'highlight',
      label: {
        de: 'Darstellung',
        en: 'Appearance',
        fr: 'Apparence',
      },
      options: [
        {
          label: {
            de: 'Hervorgehoben (grüne Fläche)',
            en: 'Highlighted (green panel)',
            fr: 'Mis en évidence (panneau vert)',
          },
          value: 'highlight',
        },
        {
          label: {
            de: 'Karte (weisse Fläche)',
            en: 'Card (white panel)',
            fr: 'Carte (panneau blanc)',
          },
          value: 'card',
        },
      ],
    },
  ],
};
