import {
  canReadOutgoingEmail,
  getRoleGroupIds,
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
import {
  OUTGOING_EMAIL_TYPE_LABELS,
  outgoingEmailTypeOf,
} from '@/features/payload-cms/payload-cms/utils/outgoing-email-type';
import type { OutgoingEmail } from '@/features/payload-cms/payload-types';
import type { CollectionAfterChangeHook, CollectionConfig, Condition, FieldHook } from 'payload';

/** For a field the overview of the page already shows; see the component. */
const SHOWN_IN_OVERVIEW = {
  Field:
    '@/features/payload-cms/payload-cms/components/outgoing-email/shown-in-overview#ShownInOverview',
};

/** For a link to another record: shown when the mail has one, so the sidebar lists only those. */
const whenSet =
  (name: string): Condition =>
  (data) => {
    const value = (data as Record<string, unknown>)[name];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  };

/**
 * Keeps a bill's status in step with its mail. A mail can turn `success` or `error` from
 * several places: the queue, the bounce check, a resend, an admin's override. Watching the
 * row covers all of them.
 *
 * A mail the queue discarded is not a failed delivery: it was overtaken by a newer bill or
 * a changed registration, and says so with `mailDiscarded` in the context.
 *
 * Billing is imported lazily, because its collections import this config.
 */
const syncBillWithDelivery: CollectionAfterChangeHook<OutgoingEmail> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const before = (previousDoc as Partial<OutgoingEmail> | undefined)?.deliveryStatus;
  if (doc.deliveryStatus === before) return doc;
  if (doc.deliveryStatus !== 'success' && doc.deliveryStatus !== 'error') return doc;
  if (req.context['mailDiscarded'] === true) return doc;

  const visitDayBillId =
    typeof doc.visitDayBill === 'string' ? doc.visitDayBill : doc.visitDayBill?.id;
  if (visitDayBillId !== undefined) {
    const { recordVisitDayBillMail } =
      await import('@/features/visit-day/billing/visit-day-bill-mail');
    try {
      await recordVisitDayBillMail(req.payload, visitDayBillId, doc);
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: `Could not update Besuchstag bill ${visitDayBillId} after its mail ${doc.id} turned ${String(doc.deliveryStatus)}.`,
      });
    }
    return doc;
  }

  const { billParticipantIdOf, markBillMailFailed, markBillMailSent } =
    await import('@/features/billing/services/bill-mail-status');
  const participantId = billParticipantIdOf(doc);
  if (participantId === undefined) return doc;
  try {
    await (doc.deliveryStatus === 'success'
      ? markBillMailSent(req.payload, participantId, doc)
      : markBillMailFailed(req.payload, participantId, doc));
  } catch (error) {
    // The mail's own status is what is true; a bill that could not follow it is logged,
    // not allowed to fail the write that recorded it.
    req.payload.logger.error({
      err: error,
      msg: `Could not update bill ${participantId} after its mail ${doc.id} turned ${String(doc.deliveryStatus)}.`,
    });
  }
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
    // Written only by the mail code. The billing team reads the mails of its bills, which the
    // E-Mails tab of a registration lists.
    read: canReadOutgoingEmail,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    afterChange: [syncBillWithDelivery],
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
          Field: {
            path: '@/features/payload-cms/payload-cms/components/outgoing-email/delivery-status-field#DeliveryStatusField',
            clientProps: { systemEmails: [EMAIL_SENDER_ADDRESS] },
          },
          // The list column for a mail's state. It sits on this field rather than on the
          // delivery log, because a select can be sorted and filtered and a `json` cannot.
          Cell: {
            path: '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-cell',
            clientProps: { systemEmails: [EMAIL_SENDER_ADDRESS] },
          },
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
          Field: {
            path: '@/features/payload-cms/payload-cms/components/resend-email/resend-email-button#ResendEmailButton',
            clientProps: {
              fullAdminGroupIds: getRoleGroupIds(Roles.FullAdmin),
            },
          },
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
      label: { en: 'Last delivery report', de: 'Letzter Zustellbericht', fr: 'Dernier rapport' },
      admin: {
        readOnly: true,
        components: SHOWN_IN_OVERVIEW,
      },
    },
    {
      name: 'smtpReceivedAt',
      type: 'date',
      label: { en: 'Last attempt', de: 'Letzter Versuch', fr: 'Dernière tentative' },
      admin: {
        readOnly: true,
        components: SHOWN_IN_OVERVIEW,
      },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      label: { en: 'To', de: 'An', fr: 'À' },
      admin: {
        readOnly: true,
        components: SHOWN_IN_OVERVIEW,
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      label: { en: 'Subject', de: 'Betreff', fr: 'Objet' },
      admin: {
        readOnly: true,
        components: SHOWN_IN_OVERVIEW,
      },
    },
    {
      name: 'formSubmission',
      type: 'relationship',
      relationTo: 'form-submissions',
      hasMany: false,
      label: { en: 'Form submission', de: 'Formularantwort', fr: 'Soumission de formulaire' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: whenSet('formSubmission'),
      },
    },
    {
      name: 'billParticipant',
      type: 'relationship',
      relationTo: 'bill-participants',
      hasMany: false,
      label: { en: 'Registration', de: 'Anmeldung', fr: 'Inscription' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: whenSet('billParticipant'),
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
        condition: whenSet('billParticipants'),
      },
    },
    {
      name: 'visitDayBill',
      type: 'relationship',
      relationTo: 'visit-day-bills',
      hasMany: false,
      index: true,
      label: { en: 'Besuchstag bill', de: 'Besuchstag-Rechnung', fr: 'Facture de la journée' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: whenSet('visitDayBill'),
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
      options: Object.entries(OUTGOING_EMAIL_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      admin: {
        readOnly: true,
        components: SHOWN_IN_OVERVIEW,
      },
      hooks: {
        afterRead: [
          (({ data }): string =>
            outgoingEmailTypeOf((data ?? {}) as Record<string, unknown>)) as FieldHook,
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
        position: 'sidebar',
        condition: whenSet('form'),
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
          label: { en: 'Overview', de: 'Übersicht', fr: 'Aperçu' },
          fields: [
            {
              name: 'overview',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/outgoing-email/outgoing-email-overview#OutgoingEmailOverview',
                },
                disableListColumn: true,
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
                // A queued mail has reached nobody yet. Its refused attempts would read as
                // failed recipients here; the history above says what they were.
                condition: (data) => data['deliveryStatus'] !== 'queued',
              },
            },
          ],
        },
        {
          label: { en: 'Content', de: 'Inhalt', fr: 'Contenu' },
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
          ],
        },
        {
          label: { en: 'Technical', de: 'Technisch', fr: 'Technique' },
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
      // The sender, copies and reply address of a form mail that had to wait in the queue,
      // so it leaves the way it was written. See `sendFormEmail`.
      name: 'queuedHeaders',
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
      label: { en: 'Created', de: 'Erstellt', fr: 'Créé' },
      admin: {
        readOnly: true,
        // The document header says it.
        components: SHOWN_IN_OVERVIEW,
      },
    },
    {
      name: 'lastRetriggeredBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      label: { en: 'Last resent by', de: 'Zuletzt erneut gesendet von', fr: 'Dernier renvoi par' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: whenSet('lastRetriggeredBy'),
      },
    },
  ],
};
