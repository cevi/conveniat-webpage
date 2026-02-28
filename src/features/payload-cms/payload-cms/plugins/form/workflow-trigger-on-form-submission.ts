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

    interface WorkflowSpec {
      workflow?: string;
      condition?: {
        enabled?: boolean;
        field?: string;
        value?: string;
      };
      mapping?: Record<string, string>;
    }
    const workflowsArray = form.configuredWorkflows as unknown as WorkflowSpec[] | undefined | null;

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
    event['workflows'] = workflowsArray
      .map((w) => w.workflow)
      .filter(Boolean)
      .join(', ');

    const submissionMap = new Map(doc.submissionData.map((item) => [item.field, item.value]));
    let processedCount = 0;
    for (const spec of workflowsArray) {
      const workflowName = spec.workflow;
      if (typeof workflowName !== 'string' || workflowName.length === 0) continue;

      if (spec.condition?.enabled) {
        const { field: condField, value: expectedValue } = spec.condition;
        if (typeof condField === 'string' && typeof expectedValue === 'string') {
          const actualValue = submissionMap.get(condField);
          const normalizedActualValue = String(actualValue ?? '');
          if (normalizedActualValue !== expectedValue) {
            req.payload.logger.info({
              msg: `Skipping workflow ${workflowName} due to condition mismatch`,
              submissionId: doc.id,
              actualValue,
              expectedValue,
            });
            continue;
          }
        }
      }

      let inputData: Record<string, unknown> = {};
      const mapping = spec.mapping;

      if (mapping && Object.keys(mapping).length > 0) {
        for (const [workflowKey, formFieldName] of Object.entries(mapping)) {
          if (typeof formFieldName !== 'string' || formFieldName === '_none_') continue;
          const val = submissionMap.get(formFieldName);
          if (val !== undefined) inputData[workflowKey] = val;
        }
        event[`${workflowName}_mappingType`] = 'partial';
      } else {
        inputData = Object.fromEntries(submissionMap);
        event[`${workflowName}_mappingType`] = 'full';
      }

      await req.payload.jobs.queue({
        workflow: workflowName as keyof TypedJobs['workflows'],
        input: {
          input: {
            ...inputData,
            formSubmissionId: doc.id,
            formName: form.title,
            locale: req.locale ?? 'en',
          },
        },
      });
      processedCount++;
    }

    if (processedCount === 0) {
      event['status'] = 'skipped';
      event['reason'] = 'Workflows skipped due to conditions';
      req.payload.logger.info(event);
      return;
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
