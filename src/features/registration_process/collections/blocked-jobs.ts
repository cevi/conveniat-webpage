import type { CollectionAfterChangeHook, CollectionConfig } from 'payload';

interface BlockedJobDocument {
  id: number | string;
  status: 'pending' | 'resolved';
  originalJobId: string;
  workflowSlug: string;
  input: Record<string, unknown>;
  resolutionData?: Record<string, unknown>;
}

const afterChangeHook: CollectionAfterChangeHook<BlockedJobDocument> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { payload } = req;

  // Only trigger if status changed to 'resolved'
  if (doc.status === 'resolved' && previousDoc.status !== 'resolved') {
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
    hidden: false,
    useAsTitle: 'id',
    group: {
      en: 'Backoffice App Features',
      de: 'Backoffice App Funktionen',
      fr: 'Fonctionnalités Backoffice',
    },
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
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
      ],
      required: true,
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
