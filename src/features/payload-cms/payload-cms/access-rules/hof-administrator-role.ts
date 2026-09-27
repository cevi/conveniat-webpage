/**
 * The Cevi.DB role that opens a Hof's dashboard: the address manager (Adressverwalter/-in) of
 * the Hof's own group, an "Externe" group under "Höfe" in conveniat27, whose id is the Hof's
 * `groupId`. The role is read per group, so it opens that one Hof and no other. The billing
 * sends a Hof's reminders to the same people.
 */
export const HOF_ADMINISTRATOR_ROLE_CLASS = 'Group::MitgliederorganisationExterne::Adressverwalter';
