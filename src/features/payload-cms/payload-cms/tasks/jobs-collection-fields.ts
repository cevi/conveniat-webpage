import { createLogger } from '@/utils/server-logger';
import type { Field } from 'payload';

const logger = createLogger('jobs-collection-fields');

/**
 * Payload declares `error` inside a job's task log as `required`, and hides it behind an admin
 * condition on `state === 'failed'`. That condition only governs the form: validation runs on
 * every entry, so a succeeded one — which has no error to carry — is rejected.
 *
 * It stayed invisible while the queue wrote its bookkeeping through `db.updateJobs`, which skips
 * validation entirely. `jobs.runHooks` routes that write through `payload.update()` instead, and
 * since then every finished task ended in `Das folgende Feld ist nicht korrekt: Status > Log`:
 * the handler had already done its work, but the job never recorded that it completed.
 *
 * The field sits two levels down, inside the `Status` tab, which is why the override walks the
 * tabs instead of mapping the top-level fields.
 */
const withOptionalLogError = (field: Field): Field => {
  if (field.type === 'tabs') {
    return {
      ...field,
      tabs: field.tabs.map((tab) => ({
        ...tab,
        fields: tab.fields.map((tabField) => withOptionalLogError(tabField)),
      })),
    };
  }

  if (field.type === 'array' && field.name === 'log') {
    return {
      ...field,
      fields: field.fields.map((subField) =>
        'name' in subField && subField.name === 'error'
          ? { ...subField, required: false }
          : subField,
      ),
    };
  }

  return field;
};

/** The `error` of a task log entry, wherever Payload currently keeps it. */
const findLogError = (fields: Field[]): Field | undefined => {
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        const found = findLogError(tab.fields);
        if (found !== undefined) return found;
      }
    }
    if (field.type === 'array' && field.name === 'log') {
      return field.fields.find((subField) => 'name' in subField && subField.name === 'error');
    }
  }
  return undefined;
};

/**
 * Lets a job record a task that succeeded, by dropping the `required` flag Payload puts on the
 * error of a task log entry.
 *
 * A Payload upgrade that moves the field would leave this doing nothing, and the jobs would go
 * back to failing on their own bookkeeping — which took a while to trace the first time. So the
 * result is read back and the miss is logged rather than swallowed. Nothing is thrown: a config
 * that refuses to build is worse than a queue that is loud about being broken.
 *
 * @param fields the fields of Payload's default jobs collection
 */
export const makeJobLogErrorOptional = (fields: Field[]): Field[] => {
  const fieldsWithOptionalLogError = fields.map((field) => withOptionalLogError(field));

  const logError = findLogError(fieldsWithOptionalLogError);
  if (logError === undefined || ('required' in logError && logError.required === true)) {
    logger.error(
      'Could not make the error of a task log entry optional — Payload has moved or renamed it. ' +
        'Every job that finishes will now fail to record it, with "Status > Log".',
    );
  }

  return fieldsWithOptionalLogError;
};
