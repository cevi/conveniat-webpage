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

/**
 * The travel pass answers of persons who travel without the SBB day pass the Besuchstag ticket
 * otherwise includes: a GA already covers the journey, and children under 6 travel for free.
 * Whether someone holds a Halbtax does not change the price.
 */
const TRAVEL_PASSES_WITHOUT_RAIL_TICKET: ReadonlySet<string> = new Set(['ga', 'unter_6']);

/** Whether a person with this travel pass answer is billed the SBB day pass. */
export const needsRailTicket = (travelPass: string | undefined): boolean =>
  travelPass === undefined || !TRAVEL_PASSES_WITHOUT_RAIL_TICKET.has(travelPass);
