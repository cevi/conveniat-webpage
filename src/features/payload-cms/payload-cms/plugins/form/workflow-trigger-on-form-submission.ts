import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { AfterChangeHook as CollectionAfterChangeHook } from 'node_modules/payload/dist/collections/config/types';
import type { TypedJobs } from 'payload';

type WorkflowTriggerWideEvent = Record<string, string | number | boolean>;

export const workflowTriggerOnFormSubmission: CollectionAfterChangeHook<FormSubmission> = async ({
  doc,
  req,
}): Promise<void> => {
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

    if (form.workflow === null || form.workflow === undefined) {
      event['status'] = 'skipped';
      event['reason'] = 'No workflow configured';
      req.payload.logger.info(event);
      return;
    }

    // Update event with workflow context
     
    event['workflow'] = form.workflow;

    const submissionMap = new Map(doc.submissionData.map((item) => [item.field, item.value]));
    let inputData: Record<string, unknown> = {};
    const mapping = form.workflowMapping as Record<string, string> | undefined;

    if (mapping && Object.keys(mapping).length > 0) {
      for (const [workflowKey, formFieldName] of Object.entries(mapping)) {
        const val = submissionMap.get(formFieldName);
        if (val !== undefined) inputData[workflowKey] = val;
      }
      event['mappingType'] = 'partial';
    } else {
      inputData = Object.fromEntries(submissionMap);
      event['mappingType'] = 'full';
    }

    await req.payload.jobs.queue({
      workflow: form.workflow as keyof TypedJobs['workflows'],
      input: { input: inputData },
    });

    event['status'] = 'success';
    event['workflowTriggered'] = true;
    req.payload.logger.info(event);
  } catch (error: unknown) {
    event['status'] = 'error';
    event['error'] = error instanceof Error ? error.message : String(error);
    req.payload.logger.error(event);
  }
};
