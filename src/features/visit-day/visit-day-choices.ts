/**
 * The answers the Besuchstag field writes itself, shared by the form and the server that reads
 * them. German, because the confirmation email shows them as they are.
 */

/**
 * The Hof answer of a visitor without a connection to a Hof, who picks the day themselves, and
 * the answer to "Wen besucht ihr?" that says so.
 */
export const EXTERNAL_VISIT = 'extern';

/** The answer to "Wen besucht ihr?" of relatives visiting a child at the camp. */
export const VISITING_CHILD = 'kind';

/** The lunch answers. */
export const WITH_LUNCH = 'ja';
export const WITHOUT_LUNCH = 'nein';
