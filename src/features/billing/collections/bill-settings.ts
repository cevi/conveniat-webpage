import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import type { GlobalConfig } from 'payload';
import { z } from 'zod';

const IdValidationSchema = z.union([
  z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'Must be a number up to 6 digits'),
  z.literal(''),
  z.null(),
  z.undefined(),
]);

/**
 * A VAT split has to account for the whole net amount, or the invoice silently taxes only
 * part of the camp fee. An empty list is fine — it means "use the single VAT code".
 */
const VatSplitsValidationSchema = z
  .array(z.object({ share: z.number().nullable().optional() }).passthrough())
  .nullable()
  .optional()
  .refine(
    (splits) => {
      if (!splits || splits.length === 0) return true;
      const total = splits.reduce((sum, split) => sum + (split.share ?? 0), 0);
      // Tolerate the third of a percent that thirds-style splits cannot express exactly.
      return Math.abs(total - 100) < 0.011;
    },
    { message: 'Die Anteile der MWST-Aufteilung müssen zusammen 100% ergeben.' },
  );

/**
 * Payload Global for QR Bill configuration.
 *
 * Stores creditor information, event IDs to sync, invoice defaults,
 * role-based pricing, and email templates.
 */
export const BillSettingsGlobal: GlobalConfig = {
  slug: 'bill-settings',
  label: {
    en: 'Bill Settings',
    de: 'Rechnungs-Einstellungen',
    fr: 'Paramètres de facturation',
  },
  admin: {
    hideAPIURL: true,
    group: {
      en: 'Billing',
      de: 'Rechnungen',
      fr: 'Facturation',
    },
  },
  access: {
    read: canAccessBilling,
    update: canAccessBilling,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        // Tab 1: Events Configuration
        {
          label: {
            en: 'Events',
            de: 'Anlässe',
            fr: 'Événements',
          },
          fields: [
            {
              name: 'populateSubeventsButton',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/billing/components/populate-subevents-button#PopulateSubeventsButton',
                },
              },
            },
            {
              name: 'events',
              type: 'array',
              label: {
                en: 'Hitobito Events to Sync',
                de: 'Hitobito Anlässe zum Synchronisieren',
                fr: 'Événements Hitobito à synchroniser',
              },
              admin: {
                components: {
                  RowLabel: {
                    path: '@/features/billing/components/event-row-label#EventRowLabel',
                  },
                },
                description: {
                  en: 'Configure which Hitobito events should be synced for billing.',
                  de: 'Konfigurieren Sie, welche Hitobito-Anlässe für die Rechnungsstellung synchronisiert werden.',
                  fr: 'Configurez les événements Hitobito à synchroniser pour la facturation.',
                },
              },
              fields: [
                {
                  name: 'eventId',
                  type: 'text',
                  required: true,
                  label: {
                    en: 'Event ID',
                    de: 'Anlass-ID',
                    fr: "ID de l'événement",
                  },
                  admin: {
                    description: {
                      en: 'Hitobito event ID to sync (up to 6 digits)',
                      de: 'Hitobito Anlass-ID zum Synchronisieren (bis zu 6 Stellen)',
                      fr: "ID de l'événement Hitobito à synchroniser (jusqu'à 6 chiffres)",
                    },
                  },
                  validate: (val: string | null | undefined): string | true => {
                    const result = IdValidationSchema.safeParse(val);
                    if (!result.success) {
                      return 'Event ID must be a number up to 6 digits';
                    }
                    return true;
                  },
                },
                {
                  name: 'eventName',
                  type: 'text',
                  required: true,
                  label: {
                    en: 'Event Name',
                    de: 'Anlass-Name',
                    fr: "Nom de l'événement",
                  },
                  admin: {
                    description: {
                      en: 'Display name, e.g. "Hof Süd"',
                      de: 'Anzeigename, z.B. "Hof Süd"',
                      fr: 'Nom d\'affichage, par ex. "Hof Süd"',
                    },
                  },
                },
                {
                  name: 'groupId',
                  type: 'text',
                  required: true,
                  label: {
                    en: 'Group ID',
                    de: 'Gruppen-ID',
                    fr: 'ID du groupe',
                  },
                  admin: {
                    description: {
                      en: 'Hitobito group ID this event belongs to (up to 6 digits)',
                      de: 'Hitobito Gruppen-ID, zu der dieser Anlass gehört (bis zu 6 Stellen)',
                      fr: "ID du groupe Hitobito auquel cet événement appartient (jusqu'à 6 chiffres)",
                    },
                  },
                  validate: (val: string | null | undefined): string | true => {
                    const result = IdValidationSchema.safeParse(val);
                    if (!result.success) {
                      return 'Group ID must be a number up to 6 digits';
                    }
                    return true;
                  },
                },
              ],
            },
          ],
        },

        // Tab 2: Creditor / Invoice Settings
        {
          label: {
            en: 'Invoice Settings',
            de: 'Rechnungs-Details',
            fr: 'Détails de la facture',
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'creditorName',
                  type: 'text',
                  required: true,
                  defaultValue: 'conveniat27',
                  label: {
                    en: 'Creditor Name',
                    de: 'Name des Zahlungsempfängers',
                    fr: 'Nom du bénéficiaire',
                  },
                  admin: { readOnly: true },
                },
                {
                  name: 'creditorIban',
                  type: 'text',
                  required: true,
                  defaultValue: 'CH1030700114904034095',
                  label: {
                    en: 'IBAN',
                    de: 'IBAN',
                    fr: 'IBAN',
                  },
                  admin: { readOnly: true },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'creditorStreet',
                  type: 'text',
                  required: true,
                  // The real address, not a placeholder. These fields are readOnly, so a
                  // deployment whose `bill-settings` global has never been saved — a fresh
                  // database, a new environment — prints whatever stands here on every QR
                  // bill with no way for an operator to correct it. It used to say
                  // "Musterstrasse".
                  defaultValue: 'Sihlstrasse',
                  label: {
                    en: 'Creditor Street',
                    de: 'Strasse des Zahlungsempfängers',
                    fr: 'Rue du bénéficiaire',
                  },
                  admin: { readOnly: true },
                },
                {
                  name: 'creditorBuildingNumber',
                  type: 'text',
                  required: false,
                  defaultValue: '33',
                  label: {
                    en: 'Creditor Building Number',
                    de: 'Hausnummer des Zahlungsempfängers',
                    fr: 'Numéro de bâtiment du bénéficiaire',
                  },
                  admin: { readOnly: true },
                },
                {
                  name: 'creditorZip',
                  type: 'text',
                  defaultValue: '8001',
                  label: {
                    en: 'Creditor ZIP',
                    de: 'PLZ des Zahlungsempfängers',
                    fr: 'NPA du bénéficiaire',
                  },
                  admin: { readOnly: true },
                },
                {
                  name: 'creditorCity',
                  type: 'text',
                  defaultValue: 'Zürich',
                  label: {
                    en: 'Creditor City',
                    de: 'Ort des Zahlungsempfängers',
                    fr: 'Ville du bénéficiaire',
                  },
                  admin: { readOnly: true },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'creditorUid',
                  type: 'text',
                  required: false,
                  defaultValue: 'CHE-470.917.124',
                  label: {
                    en: 'UID / MWST-Nr.',
                    de: 'UID / MWST-Nr. (z.B. CHE-123.456.789)',
                    fr: 'IDE / Numéro de TVA',
                  },
                  admin: { readOnly: true },
                },
                {
                  name: 'creditorEmail',
                  type: 'text',
                  required: false,
                  label: {
                    en: 'Contact Email',
                    de: 'Kontakt-E-Mail',
                    fr: 'E-mail de contact',
                  },
                },
                {
                  name: 'creditorWebsite',
                  type: 'text',
                  required: false,
                  label: {
                    en: 'Website',
                    de: 'Webseite',
                    fr: 'Site web',
                  },
                },
              ],
            },
            {
              name: 'currency',
              type: 'text',
              defaultValue: 'CHF',
              label: {
                en: 'Currency',
                de: 'Währung',
                fr: 'Devise',
              },
              admin: { readOnly: true },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'nextReferenceNumber',
                  type: 'number',
                  defaultValue: 1,
                  label: {
                    en: 'Unique Invoice Number Postfix',
                    de: 'Eindeutiges Rechnungsnummer-Postfix',
                    fr: 'Postfixe unique du numéro de facture',
                  },
                  admin: {
                    readOnly: true,
                    description: {
                      en: 'Auto-incrementing counter for unique reference numbers.',
                      de: 'Automatisch fortlaufender Zähler für eindeutige Referenznummern.',
                      fr: 'Compteur auto-incrémenté pour les numéros de référence uniques.',
                    },
                  },
                },
              ],
            },
            {
              name: 'documentTitle',
              type: 'text',
              defaultValue: 'ANMELDEBESTÄTIGUNG UND RECHNUNG',
              label: {
                en: 'Document Title',
                de: 'Dokumenttitel',
                fr: 'Titre du document',
              },
              admin: {
                description: {
                  en: 'The main title printed on the PDF.',
                  de: 'Der Haupttitel, der auf das PDF gedruckt wird.',
                  fr: 'Le titre principal imprimé sur le PDF.',
                },
              },
            },
            {
              name: 'invoiceNumberPrefix',
              type: 'text',
              defaultValue: '{{year}}',
              label: {
                en: 'Invoice Number Prefix (Additional Info)',
                de: 'Rechnungsnummer-Präfix (Zusätzliche Infos)',
                fr: 'Préfixe du numéro de facture (Infos sup.)',
              },
              admin: {
                description: {
                  en: 'Prefix for the invoice number. Placeholders: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                  de: 'Rechnungsnummer-Präfix (Zusätzliche Infos). Platzhalter: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                  fr: 'Préfixe pour le numéro de facture. Espaces réservés: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                },
              },
            },
            {
              name: 'customReferenceTemplate',
              type: 'text',
              defaultValue: '{{event-id}}-{{participation-id}}',
              label: {
                en: 'Registration Number',
                de: 'Anmeldenummer',
                fr: "Numéro d'inscription",
              },
              admin: {
                description: {
                  en: 'Printed on the PDF and encoded in the QR bill. Placeholders: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                  de: 'Wird auf das PDF gedruckt und in die QR-Rechnung codiert. Platzhalter: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                  fr: 'Imprimé sur le PDF et encodé dans la facture QR. Espaces réservés: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                },
              },
            },
            {
              name: 'eventNumberTemplate',
              type: 'text',
              defaultValue: '{{event-id}}',
              label: {
                en: 'Event Number',
                de: 'Eventnummer',
                fr: "Numéro d'événement",
              },
              admin: {
                description: {
                  en: 'Printed on the PDF below the Registration Number. Placeholders: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                  de: 'Wird auf das PDF unterhalb der Anmeldenummer gedruckt. Platzhalter: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.',
                  fr: "Imprimé sur le PDF sous le numéro d'inscription. Espaces réservés: {{year}}, {{month}}, {{event-id}}, {{group-id}}, {{participation-id}}, {{people-id}}.",
                },
              },
            },
            {
              name: 'paymentDeadlineDays',
              type: 'number',
              defaultValue: 30,
              label: {
                en: 'Payment Deadline (days)',
                de: 'Zahlungsfrist (Tage)',
                fr: 'Délai de paiement (jours)',
              },
            },
            {
              name: 'invoiceLetterText',
              type: 'textarea',
              defaultValue:
                'Liebe/r {{firstName}},\n\nVielen Dank für deine Anmeldung zum conveniat27. Beiliegend findest du die Rechnung für den Lagerbeitrag.\n\nBitte überweise den Betrag innert 30 Tagen mit dem beigelegten Einzahlungsschein.\n\nFreundliche Grüsse\nconveniat27 – Ressort Finanzen',
              label: {
                en: 'Invoice Letter Text',
                de: 'Rechnungsbrief-Text',
                fr: 'Texte de la lettre de facture',
              },
              admin: {
                description: {
                  en: 'Text on page 1, above the registration details.',
                  de: 'Text auf Seite 1, oberhalb der Anmeldedaten.',
                  fr: 'Texte en page 1, au-dessus des données d’inscription.',
                },
              },
            },
            {
              name: 'invoiceLetterTextAfter',
              type: 'textarea',
              label: {
                en: 'Letter Text after the Registration Details',
                de: 'Text nach den Anmeldedaten',
                fr: 'Texte après les données d’inscription',
              },
              admin: {
                description: {
                  en: 'Text on page 1, below the registration details and the note about correcting them. Leave empty to print nothing. Same placeholders as above: {{firstName}}, {{amount}}, {{reference}}.',
                  de: 'Text auf Seite 1, unterhalb der Anmeldedaten und des Hinweises zu deren Korrektur. Leer lassen, um nichts zu drucken. Gleiche Platzhalter wie oben: {{firstName}}, {{amount}}, {{reference}}.',
                  fr: 'Texte en page 1, sous les données d’inscription. Laissez vide pour ne rien imprimer.',
                },
              },
            },
          ],
        },

        // Tab 3: Role-based Pricing
        {
          label: {
            en: 'Pricing',
            de: 'Preise',
            fr: 'Tarifs',
          },
          fields: [
            {
              name: 'rolePricing',
              type: 'array',
              label: {
                en: 'Role-based Pricing',
                de: 'Rollenbasierte Preise',
                fr: 'Tarification par rôle',
              },
              admin: {
                description: {
                  en: 'Define the camp fee per Hitobito event role type. Role types are matched as substring (e.g. "Participant" matches "Event::Camp::Role::Participant").',
                  de: 'Definieren Sie den Lagerbeitrag pro Hitobito-Rollentyp. Rollentypen werden als Teilstring verglichen (z.B. "Participant" passt auf "Event::Camp::Role::Participant").',
                  fr: 'Définissez le montant du camp par type de rôle Hitobito.',
                },
              },
              defaultValue: [
                {
                  roleTypePattern: 'Participant',
                  label: 'Teilnehmer:in',
                  vatCode: '2.6%',
                  amount: 150,
                },
                { roleTypePattern: 'Leader', label: 'Leiter:in', vatCode: '2.6%', amount: 50 },
                { roleTypePattern: 'Helper', label: 'Helfer:in', vatCode: '2.6%', amount: 50 },
              ],
              fields: [
                {
                  name: 'roleTypePattern',
                  type: 'text',
                  required: true,
                  label: {
                    en: 'Role Type Pattern',
                    de: 'Rollentyp-Muster',
                    fr: 'Modèle de type de rôle',
                  },
                },
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                  label: {
                    en: 'Fee Label',
                    de: 'Bezeichnung des Beitrags',
                    fr: 'Libellé de la contribution',
                  },
                  admin: {
                    description: {
                      en: 'The position line on the invoice, e.g. "Teilnehmendenbeitrag". This is what is being charged, not what the person is.',
                      de: 'Die Positionszeile auf der Rechnung, z.B. "Teilnehmendenbeitrag". Das ist, was verrechnet wird – nicht, was die Person ist.',
                      fr: 'La ligne de position sur la facture, par ex. « Teilnehmendenbeitrag ».',
                    },
                  },
                },
                {
                  name: 'roleName',
                  type: 'text',
                  required: false,
                  label: {
                    en: 'Role Name',
                    de: 'Bezeichnung der Rolle',
                    fr: 'Nom du rôle',
                  },
                  admin: {
                    description: {
                      en: 'What the person is, e.g. "Teilnehmer:in". Listed on the registration confirmation so a participant can check their role. Leave empty to fall back to the built-in German name for the Hitobito role.',
                      de: 'Was die Person ist, z.B. "Teilnehmer:in". Wird auf der Anmeldebestätigung aufgeführt, damit Teilnehmende ihre Rolle prüfen können. Leer lassen, um die eingebaute deutsche Bezeichnung der Hitobito-Rolle zu verwenden.',
                      fr: "Ce que la personne est, par ex. « Teilnehmer:in ». Affiché sur la confirmation d'inscription.",
                    },
                  },
                },
                {
                  name: 'vatCode',
                  type: 'text',
                  required: false,
                  label: {
                    en: 'VAT Code / Rate',
                    de: 'MWST-Code / Satz (z.B. 8.1%)',
                    fr: 'Code / Taux TVA',
                  },
                  admin: {
                    description: {
                      en: 'Used only when no VAT split is defined below.',
                      de: 'Wird nur verwendet, wenn unten keine MWST-Aufteilung definiert ist.',
                      fr: "Utilisé uniquement si aucune répartition de TVA n'est définie ci-dessous.",
                    },
                  },
                },
                {
                  name: 'amount',
                  type: 'number',
                  required: true,
                  label: {
                    en: 'Amount (CHF)',
                    de: 'Betrag (CHF)',
                    fr: 'Montant (CHF)',
                  },
                },
                {
                  name: 'vatSplits',
                  type: 'array',
                  label: {
                    en: 'VAT Split',
                    de: 'MWST-Aufteilung',
                    fr: 'Répartition de la TVA',
                  },
                  admin: {
                    description: {
                      en: 'Split the net amount across several VAT rates, e.g. 50% accommodation at 3.8% and 50% at 8.1%. The shares must add up to 100%. Leave empty to tax the whole amount at the VAT code above.',
                      de: 'Teile den Netto-Betrag auf mehrere MWST-Sätze auf, z.B. 50% Beherbergung zu 3.8% und 50% zu 8.1%. Die Anteile müssen zusammen 100% ergeben. Leer lassen, um den ganzen Betrag mit dem MWST-Satz oben zu besteuern.',
                      fr: "Répartissez le montant net entre plusieurs taux de TVA, par ex. 50% d'hébergement à 3.8% et 50% à 8.1%. Les parts doivent totaliser 100%. Laissez vide pour taxer le montant entier au taux ci-dessus.",
                    },
                  },
                  validate: (value: unknown): string | true => {
                    const result = VatSplitsValidationSchema.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message ?? 'Die MWST-Aufteilung ist ungültig.';
                    }
                    return true;
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: false,
                      label: {
                        en: 'Label',
                        de: 'Bezeichnung',
                        fr: 'Libellé',
                      },
                      admin: {
                        description: {
                          en: 'Printed next to this VAT line on the invoice, e.g. "Beherbergung".',
                          de: 'Wird auf der Rechnung neben dieser MWST-Zeile gedruckt, z.B. "Beherbergung".',
                          fr: 'Imprimé à côté de cette ligne de TVA sur la facture.',
                        },
                      },
                    },
                    {
                      name: 'share',
                      type: 'number',
                      required: true,
                      label: {
                        en: 'Share (%)',
                        de: 'Anteil (%)',
                        fr: 'Part (%)',
                      },
                    },
                    {
                      name: 'vatCode',
                      type: 'text',
                      required: true,
                      label: {
                        en: 'VAT Rate',
                        de: 'MWST-Satz (z.B. 3.8%)',
                        fr: 'Taux TVA',
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: 'vatExemption',
              type: 'group',
              label: {
                en: 'Youth VAT Exemption',
                de: 'MWST-Befreiung für Jugendliche',
                fr: 'Exonération de TVA pour les jeunes',
              },
              admin: {
                description: {
                  en: 'Branchen-Info 24, Ziff. 18.4: a participant counts as under-age until the end of the calendar year in which they reach the age limit. Bills for them carry no VAT.',
                  de: 'Branchen-Info 24, Ziff. 18.4: Teilnehmende gelten bis zum Ende des Kalenderjahres, in dem sie die Altersgrenze erreichen, als jugendlich. Ihre Rechnungen sind MWST-befreit.',
                  fr: "Branchen-Info 24, ch. 18.4 : un participant est considéré comme mineur jusqu'à la fin de l'année civile durant laquelle il atteint la limite d'âge.",
                },
              },
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  defaultValue: true,
                  label: {
                    en: 'Apply the youth exemption',
                    de: 'MWST-Befreiung für Jugendliche anwenden',
                    fr: "Appliquer l'exonération pour les jeunes",
                  },
                  admin: {
                    description: {
                      en: 'When off, every bill is taxed regardless of the participant’s age.',
                      de: 'Wenn deaktiviert, wird jede Rechnung unabhängig vom Alter besteuert.',
                      fr: "Si désactivé, chaque facture est taxée indépendamment de l'âge.",
                    },
                  },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'maxAge',
                      type: 'number',
                      defaultValue: 18,
                      label: {
                        en: 'Age Limit',
                        de: 'Altersgrenze',
                        fr: "Limite d'âge",
                      },
                      admin: {
                        description: {
                          en: 'Someone reaching this age during the reference year is still exempt for that whole year.',
                          de: 'Wer im Referenzjahr dieses Alter erreicht, gilt für das ganze Jahr noch als jugendlich.',
                          fr: "Une personne atteignant cet âge pendant l'année de référence reste exonérée toute l'année.",
                        },
                      },
                    },
                    {
                      name: 'referenceYearMode',
                      type: 'select',
                      defaultValue: 'invoiceYear',
                      label: {
                        en: 'Reference Year',
                        de: 'Referenzjahr',
                        fr: 'Année de référence',
                      },
                      options: [
                        {
                          value: 'invoiceYear',
                          label: {
                            en: 'Year the bill is raised',
                            de: 'Jahr der Rechnungsstellung',
                            fr: "Année d'émission de la facture",
                          },
                        },
                        {
                          value: 'fixedYear',
                          label: {
                            en: 'Fixed year (e.g. the camp year)',
                            de: 'Festes Jahr (z.B. Lagerjahr)',
                            fr: 'Année fixe (par ex. année du camp)',
                          },
                        },
                      ],
                      admin: {
                        description: {
                          en: 'The VAT debt arises when the bill is raised, so that is the default. Pick the fixed year to judge every participant against the camp year instead.',
                          de: 'Die MWST-Schuld entsteht im Zeitpunkt der Rechnungsstellung – daher der Standard. Wähle das feste Jahr, um alle Teilnehmenden am Lagerjahr zu messen.',
                          fr: "La dette de TVA naît lors de l'émission de la facture, d'où le défaut.",
                        },
                      },
                    },
                    {
                      name: 'fixedReferenceYear',
                      type: 'number',
                      defaultValue: 2027,
                      label: {
                        en: 'Fixed Reference Year',
                        de: 'Festes Referenzjahr',
                        fr: 'Année de référence fixe',
                      },
                      admin: {
                        condition: (_, siblingData): boolean =>
                          (siblingData as { referenceYearMode?: string } | undefined)
                            ?.referenceYearMode === 'fixedYear',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        // Tab 4: Accounting / Finance
        {
          label: {
            en: 'Accounting',
            de: 'Buchhaltung',
            fr: 'Comptabilité',
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'accountDebit',
                  type: 'text',
                  defaultValue: '1100',
                  label: {
                    en: 'Debit Account',
                    de: 'Debitorenkonto',
                    fr: 'Compte débiteur',
                  },
                },
                {
                  name: 'accountCredit',
                  type: 'text',
                  defaultValue: '3000',
                  label: {
                    en: 'Credit Account',
                    de: 'Erfolgskonto',
                    fr: 'Compte de résultat',
                  },
                },
              ],
            },

            {
              name: 'scheduledReport',
              type: 'group',
              label: {
                en: 'Weekly Report',
                de: 'Wöchentlicher Bericht',
                fr: 'Rapport hebdomadaire',
              },
              admin: {
                description: {
                  en: 'Emails the registration report and the bill overview on a fixed weekday.',
                  de: 'Verschickt den Anmeldestand-Bericht und die Rechnungsübersicht an einem festen Wochentag.',
                  fr: "Envoie le rapport d'inscriptions et la synthèse des factures un jour fixe.",
                },
              },
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  defaultValue: false,
                  label: {
                    en: 'Send the weekly report',
                    de: 'Wochenbericht versenden',
                    fr: 'Envoyer le rapport hebdomadaire',
                  },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'weekday',
                      type: 'select',
                      defaultValue: '1',
                      label: { en: 'Weekday', de: 'Wochentag', fr: 'Jour' },
                      options: [
                        { value: '1', label: { en: 'Monday', de: 'Montag', fr: 'Lundi' } },
                        { value: '2', label: { en: 'Tuesday', de: 'Dienstag', fr: 'Mardi' } },
                        { value: '3', label: { en: 'Wednesday', de: 'Mittwoch', fr: 'Mercredi' } },
                        { value: '4', label: { en: 'Thursday', de: 'Donnerstag', fr: 'Jeudi' } },
                        { value: '5', label: { en: 'Friday', de: 'Freitag', fr: 'Vendredi' } },
                        { value: '6', label: { en: 'Saturday', de: 'Samstag', fr: 'Samedi' } },
                        { value: '0', label: { en: 'Sunday', de: 'Sonntag', fr: 'Dimanche' } },
                      ],
                    },
                    {
                      name: 'hour',
                      type: 'number',
                      defaultValue: 7,
                      min: 0,
                      max: 23,
                      label: {
                        en: 'Hour (0–23, Europe/Zurich)',
                        de: 'Stunde (0–23, Europe/Zürich)',
                        fr: 'Heure (0–23, Europe/Zurich)',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'attachPdf',
                      type: 'checkbox',
                      defaultValue: true,
                      label: {
                        en: 'Attach the registration report (PDF)',
                        de: 'Anmeldestand-Bericht anhängen (PDF)',
                        fr: "Joindre le rapport d'inscriptions (PDF)",
                      },
                    },
                    {
                      name: 'attachExcel',
                      type: 'checkbox',
                      defaultValue: true,
                      label: {
                        en: 'Attach the bill overview (Excel)',
                        de: 'Rechnungsübersicht anhängen (Excel)',
                        fr: 'Joindre la synthèse des factures (Excel)',
                      },
                    },
                  ],
                },
                {
                  name: 'recipients',
                  type: 'text',
                  label: {
                    en: 'Recipients',
                    de: 'Empfänger',
                    fr: 'Destinataires',
                  },
                  admin: {
                    description: {
                      en: 'Comma-separated. Leave empty to use the finance recipients below.',
                      de: 'Kommagetrennt. Leer lassen, um die Finanz-Empfänger unten zu verwenden.',
                      fr: 'Séparés par des virgules. Vide = destinataires finances ci-dessous.',
                    },
                  },
                },
                {
                  name: 'subject',
                  type: 'text',
                  defaultValue: 'conveniat27 – Anmeldestand vom {{date}}',
                  label: { en: 'Subject', de: 'Betreff', fr: 'Sujet' },
                  admin: {
                    description: {
                      en: 'Placeholders: {{date}}, {{total}}, {{new}}, {{blocked}}.',
                      de: 'Platzhalter: {{date}}, {{total}}, {{new}}, {{blocked}}.',
                      fr: 'Espaces réservés : {{date}}, {{total}}, {{new}}, {{blocked}}.',
                    },
                  },
                },
                {
                  name: 'body',
                  type: 'textarea',
                  defaultValue:
                    'Guten Morgen\n\nAnbei der aktuelle Anmeldestand für das conveniat27.\n\nAngemeldet: {{total}}\nNeu diese Woche: {{new}}\nNoch nicht verrechenbar: {{blocked}}\n\nDetails und mögliche Probleme stehen im angehängten Bericht.\n\nFreundliche Grüsse\nconveniat27 – Ressort Finanzen',
                  label: { en: 'Email Text', de: 'E-Mail-Text', fr: "Texte de l'e-mail" },
                  admin: {
                    description: {
                      en: 'Same placeholders as the subject.',
                      de: 'Gleiche Platzhalter wie beim Betreff.',
                      fr: 'Mêmes espaces réservés que le sujet.',
                    },
                  },
                },
                {
                  name: 'lastSentAt',
                  type: 'date',
                  label: { en: 'Last sent', de: 'Zuletzt versendet', fr: 'Dernier envoi' },
                  admin: {
                    readOnly: true,
                    description: {
                      en: 'Written by the scheduler. Also what stops a second send in the same week.',
                      de: 'Wird vom Zeitplan gesetzt. Verhindert zugleich einen zweiten Versand in derselben Woche.',
                      fr: 'Écrit par le planificateur; empêche un second envoi la même semaine.',
                    },
                  },
                },
              ],
            },
            {
              name: 'financeEmailRecipients',
              type: 'text',
              defaultValue: '',
              label: {
                en: 'Finance Email Recipients',
                de: 'Finanz-E-Mail-Empfänger',
                fr: 'Destinataires e-mail finances',
              },
              admin: {
                description: {
                  en: 'Comma-separated list of email addresses to receive the CSV export.',
                  de: 'Kommagetrennte Liste von E-Mail-Adressen für den CSV-Export.',
                  fr: "Liste d'adresses e-mail séparées par des virgules pour l'export CSV.",
                },
              },
            },
          ],
        },

        // Tab 5: Email Template
        {
          label: {
            en: 'Email Template',
            de: 'E-Mail-Vorlage',
            fr: "Modèle d'e-mail",
          },
          fields: [
            {
              name: 'invoiceEmailSubject',
              type: 'text',
              defaultValue: 'conveniat27 – Anmeldebestätigung und Rechnung',
              label: {
                en: 'Email Subject',
                de: 'E-Mail-Betreff',
                fr: "Sujet de l'e-mail",
              },
            },
            {
              name: 'invoiceEmailBody',
              type: 'textarea',
              defaultValue:
                'Liebe/r {{firstName}},\n\nVielen Dank für deine Anmeldung zum conveniat27. Im Anhang findest du deine Anmeldebestätigung inkl. Rechnung.\n\nBitte überweise den Betrag innert 30 Tagen.\n\nFreundliche Grüsse\nconveniat27 – Ressort Finanzen',
              label: {
                en: 'Email Body',
                de: 'E-Mail-Text',
                fr: "Corps de l'e-mail",
              },
              admin: {
                description: {
                  en: 'Use {{firstName}}, {{lastName}}, {{fullName}}, {{amount}}, {{reference}} as placeholders.',
                  de: 'Verwende {{firstName}}, {{lastName}}, {{fullName}}, {{amount}}, {{reference}} als Platzhalter.',
                  fr: 'Utilisez {{firstName}}, {{lastName}}, {{fullName}}, {{amount}}, {{reference}} comme espaces réservés.',
                },
              },
            },
          ],
        },

        // Tab 6: PDF Preview
        {
          label: {
            en: 'PDF Preview',
            de: 'PDF Vorschau',
            fr: 'Aperçu PDF',
          },
          fields: [
            {
              name: 'referenceNumberExplainer',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/billing/components/reference-number-explainer#ReferenceNumberExplainer',
                },
              },
            },
            {
              name: 'pdfPreview',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/billing/components/bill-preview-component#BillPreviewComponent',
                },
              },
            },
          ],
        },
      ],
    },
  ],
};
