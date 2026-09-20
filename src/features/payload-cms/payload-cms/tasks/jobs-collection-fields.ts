import type { Field } from 'payload';

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

/**
 * Lets a job record a task that succeeded, by dropping the `required` flag Payload puts on the
 * error of a task log entry.
 *
 * @param fields the fields of Payload's default jobs collection
 */
export const makeJobLogErrorOptional = (fields: Field[]): Field[] =>
  fields.map((field) => withOptionalLogError(field));
