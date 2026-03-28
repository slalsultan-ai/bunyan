import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  await client.execute("DELETE FROM site_content WHERE key = 'admin_session'");
  console.log('Admin session invalidated — all admin logins have been logged out.');
  await client.close();
}

main();
