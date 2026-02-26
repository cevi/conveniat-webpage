import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { AfterChangeHook as CollectionAfterChangeHook } from 'node_modules/payload/dist/collections/config/types';
import type { TypedJobs } from 'payload';

type WorkflowTriggerWideEvent = Record<string, string | number | boolean>;

export const workflowTriggerOnFormSubmission: CollectionAfterChangeHook<FormSubmission> = async ({
  doc,
  req,
  operation,
}): Promise<void> => {
  if (operation !== 'create') {
    return;
  }
  const event: WorkflowTriggerWideEvent = {
    msg: 'Workflow Trigger Execution',
    submissionId: doc.id,
    formId: typeof doc.form === 'object' ? doc.form.id : doc.form,
    status: 'pending',
    workflowTriggered: false,
  };

  try {
    if (!doc.submissionData || !Array.isArray(doc.submissionData)) {
      event['status'] = 'skipped';
      event['reason'] = 'No submission data found';
      req.payload.logger.warn(event);
      return;
    }

    const form = await req.payload.findByID({
      collection: 'forms',
      id: event['formId'] as string,
      depth: 0,
    });

    const workflowsArray = form.workflow as unknown as string[] | undefined | null;

    if (
      workflowsArray === undefined ||
      workflowsArray === null ||
      !Array.isArray(workflowsArray) ||
      workflowsArray.length === 0
    ) {
      event['status'] = 'skipped';
      event['reason'] = 'No workflows configured';
      req.payload.logger.info(event);
      return;
    }

    // Update event with workflows context
    event['workflows'] = workflowsArray.join(', ');

    const submissionMap = new Map(doc.submissionData.map((item) => [item.field, item.value]));
    const rawMapping = form.workflowMapping as Record<string, unknown> | undefined;

    const getWorkflowMapping = (workflowId: string): Record<string, string> | undefined => {
      if (!rawMapping) return undefined;
      // Check if it's the new nested format
      if (rawMapping[workflowId] !== undefined && typeof rawMapping[workflowId] === 'object') {
        return rawMapping[workflowId] as Record<string, string>;
      }
      // Fallback for previous flat format
      return rawMapping as Record<string, string>;
    };

    for (const workflow of workflowsArray) {
      let inputData: Record<string, unknown> = {};
      const mapping = getWorkflowMapping(workflow);

      if (mapping && Object.keys(mapping).length > 0) {
        for (const [workflowKey, formFieldName] of Object.entries(mapping)) {
          if (typeof formFieldName !== 'string') continue;
          const val = submissionMap.get(formFieldName);
          if (val !== undefined) inputData[workflowKey] = val;
        }
        event[`${workflow}_mappingType`] = 'partial';
      } else {
        inputData = Object.fromEntries(submissionMap);
        event[`${workflow}_mappingType`] = 'full';
      }

      await req.payload.jobs.queue({
        workflow: workflow as keyof TypedJobs['workflows'],
        input: {
          input: {
            ...inputData,
            formSubmissionId: doc.id,
            locale: req.locale ?? 'en',
          },
        },
      });
    }

    event['status'] = 'success';
    event['workflowTriggered'] = true;
    req.payload.logger.info(event);
  } catch (error: unknown) {
    event['status'] = 'error';
    event['error'] = error instanceof Error ? error.message : String(error);
    req.payload.logger.error(event);
  }
};
