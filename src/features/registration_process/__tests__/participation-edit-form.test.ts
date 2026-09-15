import {
  extractFormFields,
  parseParticipationAnswerFields,
} from '@/features/registration_process/hitobito-api/html-parser';

/**
 * The participation edit page as today's Cevi.DB renders it: nested attributes, the
 * question id in a hidden field beside the answer, and the attributes in the order Rails
 * emits them (`value` before `name` for a text field).
 */
const nestedAttributesForm = `
<form action="/groups/7/events/42/participations/900/edit" method="post">
  <input type="hidden" name="authenticity_token" value="tok" />
  <div class="form-group">
    <label class="col-md-3 control-label" for="event_participation_answers_attributes_0_answer">AHV-Nummer?</label>
    <input value="756.1234.5678.90" type="text" name="event_participation[answers_attributes][0][answer]" id="event_participation_answers_attributes_0_answer" />
    <input value="13650" autocomplete="off" type="hidden" name="event_participation[answers_attributes][0][question_id]" id="event_participation_answers_attributes_0_question_id" />
    <input value="340111" autocomplete="off" type="hidden" name="event_participation[answers_attributes][0][id]" />
  </div>
  <div class="form-group">
    <label class="col-md-3 control-label" for="event_participation_answers_attributes_1_answer">Administrationsangaben &raquo; Anmeldestatus</label>
    <select name="event_participation[answers_attributes][1][answer]" id="event_participation_answers_attributes_1_answer">
      <option value=""></option>
      <option selected="selected" value="erfasst durch AVP">erfasst durch AVP</option>
      <option value="Rechnung gestellt">Rechnung gestellt</option>
      <option value="definitiv">definitiv</option>
    </select>
    <input value="13656" autocomplete="off" type="hidden" name="event_participation[answers_attributes][1][question_id]" />
    <input value="340500" autocomplete="off" type="hidden" name="event_participation[answers_attributes][1][id]" />
  </div>
  <textarea name="event_participation[additional_information]"></textarea>
  <input type="hidden" name="event_participation[participant_id]" value="15516" />
  <input name="event_participation[payed]" type="hidden" value="0" />
  <input type="checkbox" value="1" name="event_participation[payed]" id="event_participation_payed" />
  <input type="submit" name="button" value="Speichern" />
</form>
`;

/** The older markup, which the answers scraper has always read. */
const flatForm = `
<form>
  <div class="form-group">
    <label class="control-label" for="participation_answer_13656">Administrationsangaben Anmeldestatus:</label>
    <select name="participation[answer_13656]">
      <option value="erfasst durch AVP" selected>erfasst durch AVP</option>
      <option value="definitiv">definitiv</option>
    </select>
  </div>
  <div class="form-group">
    <label class="control-label">Essgewohnheit*</label>
    <input type="text" name="participation[answer_13700]" value="vegetarisch" />
  </div>
</form>
`;

describe('parseParticipationAnswerFields', () => {
  it('finds the Anmeldestatus question on the nested-attributes form', () => {
    const anmeldestatus = parseParticipationAnswerFields(nestedAttributesForm).find((field) =>
      field.label.toLowerCase().includes('anmeldestatus'),
    );

    // The question id is what the Cevi.DB numbers per event; the field name is what a
    // write-back has to post under.
    expect(anmeldestatus?.questionId).toBe('13656');
    expect(anmeldestatus?.fieldName).toBe('event_participation[answers_attributes][1][answer]');
    expect(anmeldestatus?.value).toBe('erfasst durch AVP');
  });

  it('reads a text answer whose value attribute precedes its name', () => {
    const ahv = parseParticipationAnswerFields(nestedAttributesForm).find(
      (field) => field.questionId === '13650',
    );

    expect(ahv?.value).toBe('756.1234.5678.90');
    expect(ahv?.label).toBe('AHV-Nummer?');
  });

  it('still reads the older flat markup', () => {
    const fields = parseParticipationAnswerFields(flatForm);

    expect(fields).toEqual([
      {
        questionId: '13656',
        fieldName: 'participation[answer_13656]',
        // The trailing colon is decoration and is stripped, as it always was.
        label: 'Administrationsangaben Anmeldestatus',
        value: 'erfasst durch AVP',
      },
      {
        questionId: '13700',
        fieldName: 'participation[answer_13700]',
        label: 'Essgewohnheit',
        value: 'vegetarisch',
      },
    ]);
  });
});

describe('extractFormFields', () => {
  const fields = extractFormFields(nestedAttributesForm);

  it('keeps the hidden answer bookkeeping a nested-attributes update needs', () => {
    expect(fields['event_participation[answers_attributes][1][question_id]']).toBe('13656');
    expect(fields['event_participation[answers_attributes][1][id]']).toBe('340500');
  });

  it('carries the selected option of a select and the content of a textarea', () => {
    // Without these the PATCH would drop every answer that is not a plain text input.
    expect(fields['event_participation[answers_attributes][1][answer]']).toBe('erfasst durch AVP');
    expect(fields['event_participation[additional_information]']).toBe('');
  });

  it('leaves an unchecked checkbox at the hidden zero Rails renders in front of it', () => {
    // Taking the checkbox itself marked every participation as paid on re-submit.
    expect(fields['event_participation[payed]']).toBe('0');
  });

  it('does not re-send a submit button as form state', () => {
    expect(fields['button']).toBeUndefined();
  });
});
