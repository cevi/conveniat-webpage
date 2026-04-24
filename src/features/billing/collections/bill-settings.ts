import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import type { GlobalConfig } from 'payload';

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
              name: 'events',
              type: 'array',
              label: {
                en: 'Hitobito Events to Sync',
                de: 'Hitobito Anlässe zum Synchronisieren',
                fr: 'Événements Hitobito à synchroniser',
              },
              admin: {
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
                      en: 'Hitobito group ID this event belongs to',
                      de: 'Hitobito Gruppen-ID, zu der dieser Anlass gehört',
                      fr: 'ID du groupe Hitobito auquel cet événement appartient',
                    },
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
                },
                {
                  name: 'creditorIban',
                  type: 'text',
                  required: true,
                  defaultValue: 'CH8500700114904034095',
                  label: {
                    en: 'IBAN',
                    de: 'IBAN',
                    fr: 'IBAN',
                  },
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
                  defaultValue: 'Musterstrasse',
                  label: {
                    en: 'Creditor Street',
                    de: 'Strasse des Zahlungsempfängers',
                    fr: 'Rue du bénéficiaire',
                  },
                },
                {
                  name: 'creditorBuildingNumber',
                  type: 'text',
                  required: false,
                  defaultValue: '12a',
                  label: {
                    en: 'Creditor Building Number',
                    de: 'Hausnummer des Zahlungsempfängers',
                    fr: 'Numéro de bâtiment du bénéficiaire',
                  },
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
                  label: {
                    en: 'UID / MWST-Nr.',
                    de: 'UID / MWST-Nr. (z.B. CHE-123.456.789)',
                    fr: 'IDE / Numéro de TVA',
                  },
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
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'referencePrefix',
                  type: 'text',
                  defaultValue: '210000000003139471430',
                  label: {
                    en: 'Reference Number Prefix',
                    de: 'Referenznummer-Präfix',
                    fr: 'Préfixe du numéro de référence',
                  },
                  admin: {
                    description: {
                      en: 'Prefix for QR reference numbers. Sequential number will be appended.',
                      de: 'Präfix für QR-Referenznummern. Fortlaufende Nummer wird angehängt.',
                      fr: 'Préfixe pour les numéros de référence QR. Un numéro séquentiel sera ajouté.',
                    },
                  },
                },
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
                  en: 'Prefix for the invoice number. Placeholders: {{year}}, {{event-id}}, {{group-id}}, {{participation-id}}.',
                  de: 'Rechnungsnummer-Präfix (Zusätzliche Infos). Platzhalter: {{year}}, {{event-id}}, {{group-id}}, {{participation-id}}.',
                  fr: 'Préfixe pour le numéro de facture. Espaces réservés: {{year}}, {{event-id}}, {{group-id}}, {{participation-id}}.',
                },
              },
            },
            {
              name: 'customReferenceTemplate',
              type: 'text',
              defaultValue: '{{event-id}}-{{participation-id}}',
              label: {
                en: 'Custom Reference Number',
                de: 'Benutzerdefinierte Referenznummer',
                fr: 'Numéro de référence personnalisé',
              },
              admin: {
                description: {
                  en: 'Printed on the PDF and encoded in the QR bill. Placeholders: {{year}}, {{event-id}}, {{group-id}}, {{participation-id}}.',
                  de: 'Wird auf das PDF gedruckt und in die QR-Rechnung codiert. Platzhalter: {{year}}, {{event-id}}, {{group-id}}, {{participation-id}}.',
                  fr: 'Imprimé sur le PDF et encodé dans la facture QR. Espaces réservés: {{year}}, {{event-id}}, {{group-id}}, {{participation-id}}.',
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
                  en: 'Text for the PDF letter page before the QR bill.',
                  de: 'Text für die Brief-Seite im PDF vor dem QR-Einzahlungsschein.',
                  fr: 'Texte pour la page de lettre du PDF avant le bulletin de versement QR.',
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
                { roleTypePattern: 'Participant', label: 'Teilnehmer:in', amount: 150 },
                { roleTypePattern: 'Leader', label: 'Leiter:in', amount: 50 },
                { roleTypePattern: 'Helper', label: 'Helfer:in', amount: 50 },
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
                    en: 'Display Label',
                    de: 'Anzeigebezeichnung',
                    fr: "Libellé d'affichage",
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
