import { cookies } from 'next/headers';

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  const validToken = process.env.ADMIN_SECRET_TOKEN;
  return !!(validToken && token === validToken);
}
