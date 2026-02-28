import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { updateWorkflowStatus } from '@/features/payload-cms/payload-cms/utils/update-workflow-status';
import type { PayloadHandler } from 'payload';

export const triggerPastWorkflowsHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = request.routeParams ?? {};

    if (typeof id !== 'string') {
      return Response.json({ error: 'Missing form ID' }, { status: 400 });
    }

    const form = await request.payload.findByID({
      collection: 'forms',
      id,
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
    const workflowsArray = form.configuredWorkflows as unknown as WorkflowSpec[] | undefined;

    if (!Array.isArray(workflowsArray) || workflowsArray.length === 0) {
      return Response.json({ count: 0, message: 'No workflows configured' }, { status: 200 });
    }

    // Find all submissions for this form
    let hasMore = true;
    let page = 1;
    let enqueuedCount = 0;

    while (hasMore) {
      const submissions = await request.payload.find({
        collection: 'form-submissions',
        where: {
          form: {
            equals: id,
          },
        },
        limit: 100,
        page,
        depth: 0,
      });

      for (const document_ of submissions.docs) {
        if (!document_.submissionData || !Array.isArray(document_.submissionData)) continue;

        const submissionMap = new Map(
          document_.submissionData.map((item) => [item.field, item.value]),
        );
        const previousResults = Array.isArray(document_.workflowResults)
          ? (document_.workflowResults as Record<string, string>[])
          : [];

        for (const spec of workflowsArray) {
          const workflow = spec.workflow;
          if (typeof workflow !== 'string' || workflow.length === 0) continue;

          // Check if it was already processed successfully
          const existingResult = previousResults.find((r) => r['workflow'] === workflow);
          // If it's already success, skip to make it idempotent
          if (existingResult?.['status'] === 'success') {
            continue;
          }

          if (spec.condition?.enabled === true) {
            const { field: condField, value: expectedValue } = spec.condition;
            if (typeof condField === 'string' && typeof expectedValue === 'string') {
              const actualValue = submissionMap.get(condField);
              const normalizedActualValue = String(actualValue ?? '');
              if (normalizedActualValue !== expectedValue) {
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
          } else {
            inputData = Object.fromEntries(submissionMap);
          }

          await request.payload.jobs.queue({
            workflow: workflow as keyof import('payload').TypedJobs['workflows'],
            input: {
              input: {
                ...inputData,
                formSubmissionId: document_.id,
                locale: 'en',
              },
            },
          });

          await updateWorkflowStatus(request.payload, document_.id, workflow, 'pending');
          enqueuedCount++;
        }
      }

      hasMore = submissions.hasNextPage;
      page++;
    }

    return Response.json(
      { count: enqueuedCount, message: `Enqueued ${enqueuedCount} workflows` },
      { status: 200 },
    );
  } catch (error: unknown) {
    request.payload.logger.error({ err: error }, 'Failed to trigger past workflows');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
