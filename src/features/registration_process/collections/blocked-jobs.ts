import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionAfterChangeHook, CollectionConfig } from 'payload';

interface BlockedJobDocument {
  id: number | string;
  status: 'pending' | 'resolved' | 'rejected';
  originalJobId: string;
  workflowSlug: string;
  input: Record<string, unknown>;
  reason?: string;
  resolutionData?: Record<string, unknown>;
}

const afterChangeHook: CollectionAfterChangeHook<BlockedJobDocument> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { payload } = req;

  // Handle status changes from pending
  if (previousDoc.status === 'pending') {
    if (doc.status === 'resolved') {
      const workflowSlug = doc.workflowSlug;
      const input = doc.input;

      // Merge resolution data into input
      const newInput: Record<string, unknown> = {
        ...input,
        ...doc.resolutionData,
      };

      await payload.jobs.queue({
        workflow: workflowSlug as 'registrationWorkflow',
        input: { input: newInput },
      });

      payload.logger.info(`Blocked job resolved. Queued new job for workflow '${workflowSlug}'.`);
    } else if (doc.status === 'rejected') {
      payload.logger.info(`Blocked job rejected for workflow '${doc.workflowSlug}'.`);
    } else {
      // No transition
      return doc;
    }

    // Cleanup for both resolved and rejected
    // Delete the original blocked job record from payload-jobs
    try {
      await payload.delete({
        collection: 'payload-jobs',
        id: doc.originalJobId,
      });
      payload.logger.info(`Deleted original blocked job '${doc.originalJobId}'.`);
    } catch (error) {
      payload.logger.error(
        `Failed to delete original blocked job '${doc.originalJobId}': ${String(error)}`,
      );
    }

    // Delete the blocked job record
    await payload.delete({
      collection: 'blocked-jobs',
      id: doc.id,
    });
  }

  return doc;
};

export const BlockedJobs: CollectionConfig = {
  slug: 'blocked-jobs',
  admin: {
    hidden: true,
    useAsTitle: 'id',
    group: AdminPanelDashboardGroups.HelferAnmeldung,
  },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    afterChange: [afterChangeHook],
  },
  fields: [
    {
      name: 'originalJobId',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description: {
          en: 'The original payload job ID that was blocked.',
          de: 'Die ursprüngliche Aufgaben-ID, die blockiert wurde.',
          fr: "L'identifiant original de la tâche qui a été bloquée.",
        },
      },
    },
    {
      name: 'workflowSlug',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description: {
          en: 'The workflow that will be re-queued upon resolution.',
          de: 'Der Workflow, der nach der Auflösung erneut eingereiht wird.',
          fr: "Le workflow qui sera remis en file d'attente après résolution.",
        },
      },
    },
    {
      name: 'input',
      type: 'json',
      required: true,
      admin: {
        readOnly: true,
        description: {
          en: 'The original input data for the workflow.',
          de: 'Die ursprünglichen Eingabedaten für den Workflow.',
          fr: "Les données d'entrée originales du workflow.",
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Awaiting Approval', value: 'pending' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      required: true,
    },
    {
      name: 'reason',
      type: 'text',
      admin: {
        readOnly: true,
        description: {
          en: 'The reason why the job was blocked.',
          de: 'Der Grund, warum die Aufgabe blockiert wurde.',
          fr: 'La raison pour laquelle la tâche a été bloquée.',
        },
      },
    },
    {
      name: 'resolutionData',
      type: 'json',
      admin: {
        description: {
          en: 'Resolution data to merge into the workflow input when re-queued.',
          de: 'Auflösungsdaten, die bei der erneuten Einreihung in die Workflow-Eingabe eingebunden werden.',
          fr: "Données de résolution à fusionner dans l'entrée du workflow lors de la remise en file.",
        },
      },
    },
  ],
};
