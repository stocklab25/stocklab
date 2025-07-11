import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = 'admin@stocklab.com';
const NEW_PASSWORD = 'admin12345';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

async function resetPassword() {
  // 1. Get user by email
  const getUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(ADMIN_EMAIL)}`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    } as any,
  });

  if (!getUserRes.ok) {
    console.error('Failed to fetch user:', await getUserRes.text());
    process.exit(1);
  }

  const { users } = await getUserRes.json();
  if (!users || users.length === 0) {
    console.error('User not found:', ADMIN_EMAIL);
    process.exit(1);
  }

  const userId = users[0].id;

  // 2. Update password
  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    } as any,
    body: JSON.stringify({ password: NEW_PASSWORD }),
  });

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    console.error('Failed to update password:', errorText);
    process.exit(1);
  }

  console.log(`Password for ${ADMIN_EMAIL} has been reset to '${NEW_PASSWORD}'.`);
}

resetPassword(); 