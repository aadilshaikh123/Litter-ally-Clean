// Single source of truth for the decision thresholds.
//
// These used to be duplicated across Python and Node: app.py computed an
// `is_area_clean` field that Node never read, because complaintController.js
// re-derived the same test itself. The comment there already recorded one
// silent drift (10 -> 30). Both call sites now import from here.

/** A report is only accepted as litter above this garbage probability (%). */
export const REPORT_MIN_GARBAGE = 50;

/** Cleanup proof is only accepted below this garbage probability (%). */
export const CLEANUP_MAX_GARBAGE = 30;

/** Cleanup proof must be taken within this many metres of the complaint. */
export const CLEANUP_MAX_DISTANCE_M = 30;

export interface ClipScores {
  clean_street_probability: number;
  garbage_probability: number;
  not_street_probability: number;
  prediction: string;
}

export const isLitter = (s: ClipScores) => s.garbage_probability >= REPORT_MIN_GARBAGE;
export const isClean = (s: ClipScores) => s.garbage_probability < CLEANUP_MAX_GARBAGE;
