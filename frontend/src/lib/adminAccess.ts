const PRIMARY_ADMIN_EMAIL = "abdirahmansm02@gmail.com";
const ADMIN_EMAILS_STORAGE_KEY = "brief.admin.registeredEmails";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getPrimaryAdminEmail(): string {
  return PRIMARY_ADMIN_EMAIL;
}

export function getDefaultAdminEmails(): string[] {
  return [PRIMARY_ADMIN_EMAIL];
}

export function loadRegisteredAdminEmails(): string[] {
  if (typeof window === "undefined") return getDefaultAdminEmails();

  const fallback = getDefaultAdminEmails();
  const raw = window.localStorage.getItem(ADMIN_EMAILS_STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;

    const normalized = parsed
      .filter((item): item is string => typeof item === "string")
      .map(normalizeEmail)
      .filter(Boolean);

    const deduped = Array.from(new Set([...fallback, ...normalized]));
    return deduped;
  } catch {
    return fallback;
  }
}

export function saveRegisteredAdminEmails(
  editorEmail: string | null | undefined,
  emails: string[]
): { ok: boolean; error?: string; saved?: string[] } {
  const normalizedEditor = normalizeEmail(editorEmail || "");
  if (normalizedEditor !== PRIMARY_ADMIN_EMAIL) {
    return {
      ok: false,
      error:
        "Not an admin registered email unless abdirahmansm02@gmail.com adds more admin emails.",
    };
  }

  const normalized = emails
    .map(normalizeEmail)
    .filter(Boolean);

  const valid = normalized.filter((item) => /.+@.+\..+/.test(item));
  const deduped = Array.from(new Set([PRIMARY_ADMIN_EMAIL, ...valid]));

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_EMAILS_STORAGE_KEY, JSON.stringify(deduped));
  }

  return { ok: true, saved: deduped };
}

export function isRegisteredAdminEmail(
  email: string | null | undefined,
  registered: string[]
): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return registered.includes(normalized);
}
