/** A colour, or a palette of colours by shade, as in the `colors` of `tailwind.config.ts`. */
export type DeploymentColor = string | Record<string, string>;

/**
 * The colours this deployment changes in `tailwind.config.ts`; conveniat27 changes none.
 *
 * konekta's build copies its own version of this file over this one, with its blue in place of
 * the conveniat green. A colour it leaves out keeps conveniat27's value, and a palette keeps the
 * shades it does not name, so a colour added to the config never breaks konekta's build.
 */
export const deploymentColors: Record<string, DeploymentColor> = {};
