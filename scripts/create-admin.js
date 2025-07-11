const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure you have:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@stocklab.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';
const ADMIN_ROLE = process.env.ADMIN_ROLE || 'ADMIN';

async function main() {
  // Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    process.exit(1);
  }
  const existingUser = users.find(u => u.email === ADMIN_EMAIL);
  if (existingUser) {
    console.log('Admin user already exists. Updating password...');
    // Reset password
    const { error: pwError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: ADMIN_PASSWORD,
      user_metadata: {
        name: ADMIN_NAME,
        role: ADMIN_ROLE,
      },
    });
    if (pwError) {
      console.error('Error updating admin password:', pwError.message);
      process.exit(1);
    }
    console.log('Admin password updated successfully!');
    process.exit(0);
  }

  try {
    // Admin user details - change these as needed
    const adminUser = {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      user_metadata: {
        name: ADMIN_NAME,
        role: ADMIN_ROLE
      }
    };

    console.log('Creating admin user...');
    console.log('Email:', adminUser.email);
    console.log('Password:', adminUser.password);

    const { data, error } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: adminUser.user_metadata
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Role:', data.user.user_metadata.role);
    console.log('\nYou can now login with:');
    console.log('Email:', adminUser.email);
    console.log('Password:', adminUser.password);

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 