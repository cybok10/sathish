/**
 * What each account may do.
 *
 * The server is the authority — every rule here has a matching check in
 * `server/api.js`. This module exists so the interface can hide what an
 * account cannot use, instead of showing a wall of 403s.
 *
 * Two roles:
 *   admin  — runs the site: publishes, deletes, manages taxonomy and writers
 *   editor — writes: creates drafts, edits their own work, submits for review
 */
export const ROLES = {
  ADMIN: "admin",
  EDITOR: "editor",
};

export function isAdmin(account) {
  return account?.role === ROLES.ADMIN;
}

export function isEditor(account) {
  return account?.role === ROLES.EDITOR;
}

/** Can publish, unpublish, schedule or feature an article. */
export function canPublish(account) {
  return isAdmin(account);
}

/** Can delete an article. */
export function canDelete(account) {
  return isAdmin(account);
}

/** Can create, rename or remove categories, tags and authors. */
export function canManageTaxonomy(account) {
  return isAdmin(account);
}

/** Can read the subscriber list or export the archive. */
export function canViewSubscribers(account) {
  return isAdmin(account);
}

/** Can add, change or disable writer accounts. */
export function canManageWriters(account) {
  return isAdmin(account);
}

/** Can read the activity log. */
export function canViewActivity(account) {
  return isAdmin(account);
}

/** The label shown next to a name in the interface. */
export function roleLabel(account) {
  if (isAdmin(account)) return "Administrator";
  if (isEditor(account)) return "Writer";
  return "Reader";
}
