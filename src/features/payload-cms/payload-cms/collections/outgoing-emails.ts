import {
  getRoleGroupIds,
  isFullAdmin,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { overrideOutgoingEmailStatusHandler } from '@/features/payload-cms/payload-cms/endpoints/override-outgoing-email';
import { resendOutgoingEmailHandler } from '@/features/payload-cms/payload-cms/endpoints/resend-outgoing-email';
import { parseSmtpResultsHook } from '@/features/payload-cms/payload-cms/hooks/parse-smtp-results';
import {
  EMAIL_SENDER_ADDRESS,
  EMAIL_SENDER_DOMAIN,
} from '@/features/payload-cms/payload-cms/utils/email-sender';
import type { OutgoingEmail } from '@/features/payload-cms/payload-types';
import type { CollectionAfterChangeHook, CollectionConfig, FieldHook } from 'payload';

/**
 * A bill counts as sent once its mail has left, and a mail can turn `success` from three
 * places: the queue, a resend, an admin's override. Watching the row covers all of them.
 *
 * Billing is imported lazily, because its collections import this config.
 */
const markBillSentOnDelivery: CollectionAfterChangeHook<OutgoingEmail> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const before = (previousDoc as Partial<OutgoingEmail> | undefined)?.deliveryStatus;
  if (doc.deliveryStatus !== 'success' || before === 'success') return doc;
  const { billParticipantIdOf, markBillMailSent } =
    await import('@/features/billing/services/bill-mail-status');
  const participantId = billParticipantIdOf(doc);
  if (participantId !== undefined) await markBillMailSent(req.payload, participantId, doc.to);
  return doc;
};

export const OutgoingEmails: CollectionConfig = {
  slug: 'outgoing-emails',
  labels: {
    singular: {
      en: 'Outgoing Email',
      de: 'Ausgehende E-Mail',
      fr: 'E-mail sortant',
    },
    plural: {
      en: 'Outgoing Emails',
      de: 'Ausgehende E-Mails',
      fr: 'E-mails sortants',
    },
  },
  admin: {
    useAsTitle: 'subject',
    group: AdminPanelDashboardGroups.BackofficeSystem.label,
    groupBy: true,
    defaultColumns: [
      'subject',
      'to',
      'type',
      'form',
      'deliveryStatus',
      'smtpReceivedAt',
      'dsnReceivedAt',
      'createdAt',
    ],
  },
  access: {
    // read only for admins, only access programmatically
    read: isFullAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    afterChange: [markBillSentOnDelivery],
    beforeOperation: [
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      ({ args, operation }): void => {
        if (
          (operation === 'find' || operation === 'findByID') &&
          (args.depth === undefined || args.depth === 0)
        ) {
          args.depth = 1;
        }
      },
    ],
  },
  endpoints: [
    {
      path: '/:id/resend',
      method: 'post',
      handler: resendOutgoingEmailHandler,
    },
    {
      path: '/:id/override-status',
      method: 'post',
      handler: overrideOutgoingEmailStatusHandler,
    },
  ],
  fields: [
    {
      name: 'deliveryStatus',
      type: 'select',
      label: { en: 'Delivery', de: 'Zustellung', fr: 'Livraison' },
      options: [
        // Waiting for room in the hourly budget for background mail. See `email-outbox`.
        {
          label: { en: 'Queued', de: 'In Warteschlange', fr: "En file d'attente" },
          value: 'queued',
        },
        { label: 'Pending', value: 'pending' },
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'pending',
      admin: {
        readOnly: true,
        position: 'sidebar',
        components: {
          // The list column for a mail's state. It sits on this field rather than on the
          // delivery log, because a select can be sorted and filtered and a `json` cannot.
          Cell: '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-cell',
        },
      },
      index: true,
    },
    {
      name: 'resendAction',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/resend-email/resend-email-button#ResendEmailButton',
        },
      },
    },
    {
      name: 'overrideStatusAction',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: {
            path: '@/features/payload-cms/payload-cms/components/override-status/override-status-button#OverrideStatusButton',
            clientProps: {
              fullAdminGroupIds: getRoleGroupIds(Roles.FullAdmin),
            },
          },
        },
      },
    },
    {
      name: 'dsnReceivedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'smtpReceivedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'formSubmission',
      type: 'relationship',
      relationTo: 'form-submissions',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'billParticipant',
      type: 'relationship',
      relationTo: 'bill-participants',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      // A reminder to a Hof's Adressverwalter covers every registration that is missing
      // something, so one mail links to many participants.
      name: 'billParticipants',
      type: 'relationship',
      relationTo: 'bill-participants',
      hasMany: true,
      label: {
        en: 'Affected registrations',
        de: 'Betroffene Anmeldungen',
        fr: 'Inscriptions concernées',
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'type',
      label: {
        en: 'Type',
        de: 'Typ',
        fr: 'Type',
      },
      type: 'select',
      virtual: true,
      options: [
        {
          label: {
            en: 'Form Submission',
            de: 'Formular Antwort',
            fr: 'Soumission de formulaire',
          },
          value: 'formSubmission',
        },
        {
          label: {
            en: 'Bill Participant',
            de: 'Rechnungsteilnehmer',
            fr: 'Participant à la facture',
          },
          value: 'billParticipant',
        },
        {
          label: {
            en: 'Other',
            de: 'Andere',
            fr: 'Autre',
          },
          value: 'other',
        },
      ],
      admin: {
        readOnly: true,
      },
      hooks: {
        afterRead: [
          (({ data }): string => {
            const safeData = (data ?? {}) as Record<string, unknown>;
            const formSubmission = safeData['formSubmission'];
            const billParticipant = safeData['billParticipant'];
            const billParticipants = safeData['billParticipants'];
            if (formSubmission !== undefined && formSubmission !== null) {
              return 'formSubmission';
            }
            if (billParticipant !== undefined && billParticipant !== null) {
              return 'billParticipant';
            }
            if (Array.isArray(billParticipants) && billParticipants.length > 0) {
              return 'billParticipant';
            }
            return 'other';
          }) as FieldHook,
        ],
      },
    },
    {
      name: 'form',
      label: {
        en: 'Form',
        de: 'Formular',
        fr: 'Formulaire',
      },
      type: 'relationship',
      relationTo: 'forms',
      virtual: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        afterRead: [
          (async ({ data, req }): Promise<string | undefined> => {
            const safeData = (data ?? {}) as Record<string, unknown>;
            const formSubmission = safeData['formSubmission'];
            if (formSubmission === undefined || formSubmission === null) return undefined;

            // Fast path: if formSubmission is already eagerly populated, extract the form ID directly
            if (typeof formSubmission === 'object' && 'form' in formSubmission) {
              const formValue = (formSubmission as Record<string, unknown>)['form'];
              if (formValue !== undefined && formValue !== null) {
                return typeof formValue === 'object' && 'id' in formValue
                  ? (formValue as { id: string }).id
                  : (formValue as string);
              }
            }

            const formSubmissionId =
              typeof formSubmission === 'object' && 'id' in formSubmission
                ? (formSubmission as { id: string }).id
                : (formSubmission as string);

            if (typeof formSubmissionId !== 'string' || formSubmissionId === '') return undefined;

            try {
              const submission = await req.payload.findByID({
                collection: 'form-submissions',
                id: formSubmissionId,
                depth: 0,
              });
              const formValue = submission['form'] as unknown;
              if (formValue !== undefined && formValue !== null) {
                return typeof formValue === 'object' && 'id' in formValue
                  ? (formValue as { id: string }).id
                  : (formValue as string);
              }
            } catch (error) {
              req.payload.logger.error(
                { error, 'form.submission.id': formSubmissionId },
                'Failed to read the form submission inside the form afterRead hook',
              );
            }
            return undefined;
          }) as FieldHook,
        ],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: {
            en: 'Overview',
            de: 'Übersicht',
            fr: 'Aperçu',
          },
          fields: [
            {
              name: 'html',
              type: 'textarea',
              admin: {
                readOnly: true,
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/email-preview/email-preview-field',
                },
              },
            },
            {
              // The plain-text part. Shown by the preview above when a mail has no HTML part.
              name: 'text',
              type: 'textarea',
              admin: {
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: 'smtpResults',
              type: 'json',
              label: { en: 'Delivery log', de: 'Zustellverlauf', fr: 'Journal de livraison' },
              hooks: {
                afterRead: [parseSmtpResultsHook],
              },
              admin: {
                readOnly: true,
                components: {
                  Field: {
                    path: '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-field',
                    clientProps: {
                      smtpDomain: EMAIL_SENDER_DOMAIN,
                      systemEmails: [EMAIL_SENDER_ADDRESS],
                    },
                  },
                },
                // Shown in the list through `deliveryStatus`.
                disableListColumn: true,
                disableListFilter: true,
              },
            },
          ],
        },
        {
          label: {
            en: 'Details',
            de: 'Details',
            fr: 'Détails',
          },
          fields: [
            {
              name: 'rawSmtpResults',
              type: 'json',
              admin: {
                readOnly: true,
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/smtp-results/raw-smtp-results-field',
                },
              },
            },
            {
              name: 'rawDsnEmail',
              type: 'textarea',
              admin: {
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
    {
      // Where the attachments of a queued mail wait. Emptied once the mail leaves the queue.
      name: 'queuedAttachments',
      type: 'json',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'createdAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'lastRetriggeredBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
};
