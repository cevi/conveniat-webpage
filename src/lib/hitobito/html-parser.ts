/**
 * Extract the rails authenticity token from input value
 */
export function extractAuthenticityToken(html: string): string {
  // Find the input tag with name="authenticity_token"
  const tagMatch = html.match(/<input[^>]*name="authenticity_token"[^>]*>/);
  if (tagMatch === null) return '';

  const valueMatch = tagMatch[0].match(/value="([^"]+)"/);
  return valueMatch?.[1] ?? '';
}

/**
 * Extract the csrf token from meta tag
 */
export function extractCsrfMetaToken(html: string): string {
  const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
  if (match === null) return '';
  return match[1] ?? '';
}

/**
 * Reads one attribute off a single tag. Rails emits the attributes of a field in an order
 * that differs between helpers and versions, so nothing may assume `name` comes before
 * `value`.
 */
function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return match?.[1];
}

/** Whether a radio or checkbox tag carries `checked`, in any of the spellings Rails uses. */
function isChecked(tag: string): boolean {
  return /\schecked(?:="[^"]*")?[\s/>]/i.test(tag);
}

/**
 * A form value arrives HTML-escaped. Posting it back verbatim would turn an `&` into
 * `&amp;` on every round trip, so the few entities Rails escapes are undone here.
 */
function decodeEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&');
}

/** How often a Cevi.DB value may be escaped before we stop unwrapping it. */
const MAX_DECODE_PASSES = 5;

/**
 * Decodes a Cevi.DB value that is only ever displayed, never posted back.
 *
 * Names entered through the Cevi.DB web forms are stored already escaped and escaped
 * again on the way out, so a Hof called `Altstetten & Albisrieden` reaches us as
 * `Altstetten &amp;amp; Albisrieden`. One pass is not enough for those, so this repeats
 * until the value stops changing.
 *
 * Use {@link decodeEntities} instead for anything that goes back to Cevi.DB: a form value
 * is escaped exactly once, and unwrapping it twice would post back a different string.
 */
export function decodeDisplayText(value: string): string {
  let current = value;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass++) {
    const decoded = decodeEntities(current);
    if (decoded === current) return current;
    current = decoded;
  }
  return current;
}

/** The value a browser would submit for a `<select>`, given its inner HTML. */
function selectedOptionValue(optionsHtml: string): string {
  const selected = optionsHtml.match(/<option[^>]*\sselected(?:="[^"]*")?[^>]*>/i);
  if (selected !== null) return attribute(selected[0], 'value') ?? '';
  // With nothing marked selected a browser submits the first option.
  const first = optionsHtml.match(/<option[^>]*>/i);
  return first === null ? '' : (attribute(first[0], 'value') ?? '');
}

/**
 * Extract the current state of a form, so it can be posted back unchanged.
 *
 * Everything a browser would submit is included: text and hidden inputs, the selected
 * option of a select, the content of a textarea, and only those radios and checkboxes
 * that are checked. An unchecked checkbox used to be picked up and overwrote the hidden
 * `0` Rails renders in front of it, which silently ticked every box on a re-submitted
 * form.
 */
export function extractFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const match of html.matchAll(/<input[^>]*>/g)) {
    const tag = match[0];
    const name = attribute(tag, 'name');
    const value = attribute(tag, 'value');
    if (name === undefined || value === undefined) continue;

    const type = (attribute(tag, 'type') ?? 'text').toLowerCase();
    // A file input has nothing to re-send and a button is not form state.
    if (type === 'file' || type === 'submit' || type === 'button' || type === 'image') continue;
    if ((type === 'radio' || type === 'checkbox') && !isChecked(tag)) continue;

    fields[name] = decodeEntities(value);
  }

  for (const match of html.matchAll(/<select([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = attribute(match[1] ?? '', 'name');
    if (name === undefined) continue;
    fields[name] = decodeEntities(selectedOptionValue(match[2] ?? ''));
  }

  for (const match of html.matchAll(/<textarea([^>]*)>([\s\S]*?)<\/textarea>/gi)) {
    const name = attribute(match[1] ?? '', 'name');
    if (name === undefined) continue;
    fields[name] = decodeEntities(match[2] ?? '');
  }

  return fields;
}

/** A single custom-question answer control on a Hitobito participation edit form. */
export interface ParticipationAnswerField {
  /** The Cevi.DB question id. */
  questionId: string;
  /** The `name` of the control carrying the answer, ready to be posted back. */
  fieldName: string;
  /** The question text as an editor sees it, `''` when the form carries no label for it. */
  label: string;
  /** The answer on the form, `undefined` when no control could be read. */
  value: string | undefined;
}

function escapeForRegex(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** The `id` Rails derives from a field name, which its `<label for=...>` points at. */
function railsFieldId(fieldName: string): string {
  return fieldName.replaceAll(/[[\]]+/g, '_').replace(/_$/, '');
}

/**
 * Every answer control on the form, under both namings Hitobito has used: the flat
 * `participation[answer_<questionId>]` of the older markup and the nested
 * `event_participation[answers_attributes][<i>][answer]` the Turbo-based edit page posts,
 * where the question id sits in a hidden field beside the answer instead of in its name.
 */
function collectAnswerControls(html: string): { questionId: string; fieldName: string }[] {
  const controls = new Map<string, string>();

  for (const match of html.matchAll(/name="participation\[answer_(\d+)\]/g)) {
    const questionId = match[1];
    if (questionId !== undefined) controls.set(`participation[answer_${questionId}]`, questionId);
  }

  for (const match of html.matchAll(/<input[^>]*>/g)) {
    const tag = match[0];
    const index = (attribute(tag, 'name') ?? '').match(
      /^event_participation\[answers_attributes]\[(\d+)]\[question_id]$/,
    )?.[1];
    const questionId = attribute(tag, 'value');
    if (index === undefined || questionId === undefined || questionId === '') continue;
    controls.set(`event_participation[answers_attributes][${index}][answer]`, questionId);
  }

  return [...controls].map(([fieldName, questionId]) => ({ fieldName, questionId }));
}

/** The question text belonging to an answer control, searched backwards from the control. */
function findFieldLabel(html: string, fieldName: string): string {
  let questionText = '';

  const inputPos = html.indexOf(fieldName);
  if (inputPos !== -1) {
    const precedingHtml = html.slice(Math.max(0, inputPos - 1000), inputPos);
    const labels = [...precedingHtml.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/gi)];

    if (labels.length > 0) {
      const controlLabel = labels
        .reverse()
        .find((l) => l[0].includes('control-label') || !l[0].includes('for='));
      if (controlLabel?.[1] === undefined) {
        const firstLabel = labels[0];
        if (firstLabel?.[1] !== undefined) {
          questionText = firstLabel[1].replaceAll(/<[^>]*>/g, '').trim();
        }
      } else {
        questionText = controlLabel[1].replaceAll(/<[^>]*>/g, '').trim();
      }
    }
  }

  // Fall back to the label that points at the control by id. The optional suffix catches
  // the per-option ids Rails gives radio buttons.
  if (questionText === '') {
    const labelMatch = html.match(
      new RegExp(
        `<label[^>]*for="${escapeForRegex(railsFieldId(fieldName))}(?:_[^"]*)?"[^>]*>([\\s\\S]*?)<\\/label>`,
        'i',
      ),
    );
    if (labelMatch?.[1] !== undefined) {
      questionText = labelMatch[1].replaceAll(/<[^>]*>/g, '').trim();
    }
  }

  // Trailing colons and the asterisk marking a required question are decoration.
  return questionText === '' ? '' : questionText.replace(/[:*]$/, '').trim();
}

/** The answer a browser would submit for one named control. */
function readFieldValue(html: string, fieldName: string): string | undefined {
  const name = escapeForRegex(fieldName);

  const selectMatch = html.match(
    new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)<\\/select>`, 'i'),
  );
  if (selectMatch?.[1] !== undefined) {
    const selectedMatch =
      selectMatch[1].match(/<option[^>]*selected="selected"[^>]*value="([^"]*)"/i) ??
      selectMatch[1].match(/<option[^>]*value="([^"]*)"[^>]*selected/i);
    return selectedMatch?.[1] ?? '';
  }

  const textareaMatch = html.match(
    new RegExp(`<textarea[^>]*name="${name}"[^>]*>([\\s\\S]*?)<\\/textarea>`, 'i'),
  );
  if (textareaMatch?.[1] !== undefined) return textareaMatch[1].trim();

  // Read the inputs off their tags rather than through one regex over the whole tag: Rails
  // renders `value` before `name` for some helpers and after it for others.
  const inputs = [...html.matchAll(/<input[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => attribute(tag, 'name') === fieldName);

  const chosen =
    inputs.find((tag) => {
      const type = (attribute(tag, 'type') ?? 'text').toLowerCase();
      return (type === 'radio' || type === 'checkbox') && isChecked(tag);
    }) ??
    inputs.find((tag) => {
      const type = (attribute(tag, 'type') ?? 'text').toLowerCase();
      return type !== 'radio' && type !== 'checkbox';
    });

  return chosen === undefined ? undefined : attribute(chosen, 'value');
}

/**
 * Every custom-question answer on a participation edit page, with the question text and
 * the name to post an update under.
 */
export function parseParticipationAnswerFields(html: string): ParticipationAnswerField[] {
  return collectAnswerControls(html).map(({ questionId, fieldName }) => ({
    questionId,
    fieldName,
    label: findFieldLabel(html, fieldName),
    value: readFieldValue(html, fieldName),
  }));
}

/**
 * Extracts a pending manuelle Freigabe request from the group members HTML page.
 * Returns the group name and url if found, otherwise undefined.
 */
export function extractPendingApprovalGroup(
  html: string,
): { groupName: string; groupUrl: string } | undefined {
  const rowMatch = html.match(/<tr id="person_add_request_\d+">[\s\S]*?<\/tr>/);
  if (rowMatch === null) return undefined;

  const rowHtml = rowMatch[0];
  const linkMatch = rowHtml.match(/<a href="(\/groups\/\d+)">([^<]+)<\/a>/);
  if (linkMatch === null) return undefined;

  return {
    groupUrl: linkMatch[1] ?? '',
    groupName: linkMatch[2]?.trim() ?? '',
  };
}
