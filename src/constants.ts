/**
 * Core game constants for Apex Nebula.
 * These values define the baseline balance and reset logic.
 */

/** Initial total cubes a player starts with (Attributes + Pool). */
export const INITIAL_TOTAL_CUBES = 12;

/** Starting size of the distribution pool during setup. */
export const SETUP_POOL_SIZE = 8;

/** Default starting value for any base attribute. */
export const INITIAL_ATTRIBUTE_VALUE = 1;

/** Maximum value an attribute can reach during the setup phase. */
export const SETUP_ATTRIBUTE_CAP = 6;

/** Standard stability level after a reset or initialization. */
export const INITIAL_STABILITY = 3;

/** Standard matter level after a reset or initialization. */
export const INITIAL_MATTER = 0;

/** Standard data level after a reset or initialization. */
export const INITIAL_DATA = 0;

/** Data level granted after a hard reboot or stability failure. */
export const REBOOT_DATA_BONUS = 1;

/** Cost in data clusters to optimize (gain 1 cube). */
export const OPTIMIZE_DATA_COST = 3;

/** Number of data clusters required to win (Generation 0 check). */
export const WIN_DATA_THRESHOLD = 30;
