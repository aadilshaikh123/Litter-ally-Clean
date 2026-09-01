// Role vocabulary, in one place.
//
// The enum values match the real municipal chain:
//   Sanitary Inspector -> Mukadam -> Safai Karmachari
//
// `si`, `dsi` and `csi` used to be three separate roles that no policy ever
// distinguished. They are now one `inspector` role; the old tier survives as a
// display-only `grade` on the profile.
//
// Nothing should ever render a raw enum value - use label() / describe().

export const ROLES = ["citizen", "safai_sevak", "mukadam", "inspector", "admin"];

export const ROLE_LABELS = {
  citizen: "Citizen",
  safai_sevak: "Safai Sevak",
  mukadam: "Mukadam",
  inspector: "Sanitary Inspector",
  admin: "Administrator",
};

/** One line explaining what the role does, for the admin screen. */
export const ROLE_DESCRIPTIONS = {
  citizen: "Reports litter and tracks their own reports",
  safai_sevak: "Field worker; sees locations assigned to them",
  mukadam: "Zone supervisor; assigns workers and submits cleanup proof",
  inspector: "Ward officer; triages reports and forwards them to a Mukadam",
  admin: "Full access, including user administration",
};

/** Seniority within the inspector role. Display only - it grants nothing. */
export const GRADES = ["SI", "DSI", "CSI"];

export const GRADE_LABELS = {
  SI: "Sanitary Inspector",
  DSI: "Deputy Sanitary Inspector",
  CSI: "Chief Sanitary Inspector",
};

export const label = (role) => ROLE_LABELS[role] ?? role ?? "—";
export const describe = (role) => ROLE_DESCRIPTIONS[role] ?? "";

/** Roles that hold a municipal post, as opposed to members of the public. */
export const STAFF_ROLES = ["safai_sevak", "mukadam", "inspector", "admin"];

// Mirrors the profiles_staff_attrs_ck constraint in the database.
export const NEEDS_WARD = ["inspector", "mukadam"];
export const NEEDS_IDENTIFIER = ["inspector"];
export const NEEDS_REPORTS_TO = ["mukadam"];

/** Which required attributes a draft profile is still missing, by field label. */
export function missingFor(d) {
  const missing = [];
  if (NEEDS_WARD.includes(d.role) && !d.ward_id) missing.push("Ward");
  if (NEEDS_IDENTIFIER.includes(d.role) && !d.identifier?.trim()) missing.push("Identifier");
  if (NEEDS_REPORTS_TO.includes(d.role) && !d.reports_to?.trim()) missing.push("Reports to");
  return missing;
}
