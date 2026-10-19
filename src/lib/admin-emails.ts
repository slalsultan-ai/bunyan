/**
 * ADMIN_EMAIL is the primary admin (also receives notifications);
 * ADMIN_EMAILS is an optional comma-separated list of additional admins.
 */
export function getAdminEmails(): string[] {
  const raw = [process.env.ADMIN_EMAIL ?? '', process.env.ADMIN_EMAILS ?? ''].join(',');
  return [...new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && getAdminEmails().includes(email!.trim().toLowerCase());
}
