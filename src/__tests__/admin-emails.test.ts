import { describe, it, expect, afterEach, vi } from 'vitest';
import { getAdminEmails, isAdminEmail } from '@/lib/admin-emails';

afterEach(() => vi.unstubAllEnvs());

describe('admin emails', () => {
  it('combines the primary admin with ADMIN_EMAILS, normalised and unique', () => {
    vi.stubEnv('ADMIN_EMAIL', 'Owner@Bunyan.guru');
    vi.stubEnv('ADMIN_EMAILS', ' qa@example.com , owner@bunyan.guru,,');
    expect(getAdminEmails()).toEqual(['owner@bunyan.guru', 'qa@example.com']);
  });

  it('matches case-insensitively and rejects others', () => {
    vi.stubEnv('ADMIN_EMAIL', 'owner@bunyan.guru');
    vi.stubEnv('ADMIN_EMAILS', 'qa@example.com');
    expect(isAdminEmail('QA@Example.com ')).toBe(true);
    expect(isAdminEmail('owner@bunyan.guru')).toBe(true);
    expect(isAdminEmail('someone@example.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });

  it('works with only the primary admin configured', () => {
    vi.stubEnv('ADMIN_EMAIL', 'owner@bunyan.guru');
    vi.stubEnv('ADMIN_EMAILS', '');
    expect(getAdminEmails()).toEqual(['owner@bunyan.guru']);
  });
});
