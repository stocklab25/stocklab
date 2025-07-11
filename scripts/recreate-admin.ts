import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = 'admin@stocklab.com';
const NEW_PASSWORD = 'StockLab25!';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

async function recreateAdmin() {
  try {
    // 1. Get user by email to check if exists
    console.log('Checking if user exists...');
    const getUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(ADMIN_EMAIL)}`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      } as any,
    });

    if (getUserRes.ok) {
      const { users } = await getUserRes.json();
      if (users && users.length > 0) {
        // 2. Delete existing user
        console.log('Deleting existing user...');
        const userId = users[0].id;
        const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          } as any,
        });

        if (!deleteRes.ok) {
          console.error('Failed to delete existing user:', await deleteRes.text());
          process.exit(1);
        }
        console.log('Existing user deleted successfully.');
      }
    }

    // 3. Create new user
    console.log('Creating new admin user...');
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      } as any,
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: NEW_PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: 'ADMIN'
        }
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error('Failed to create user:', errorText);
      process.exit(1);
    }

    const newUser = await createRes.json();
    console.log(`✅ Admin user ${ADMIN_EMAIL} created successfully with password '${NEW_PASSWORD}'`);
    console.log('User ID:', newUser.id);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recreateAdmin(); 