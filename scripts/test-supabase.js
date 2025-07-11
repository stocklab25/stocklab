const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Service Key (first 20 chars):', supabaseServiceKey.substring(0, 20) + '...');

    // List all users
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    console.log('\n✅ Supabase connection successful!');
    console.log(`Found ${users.users.length} users:`);
    
    users.users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.user_metadata?.name || 'N/A'}`);
      console.log(`   Role: ${user.user_metadata?.role || 'N/A'}`);
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
    });

    if (users.users.length === 0) {
      console.log('\n❌ No users found. Run "npm run create-admin" to create an admin user.');
    }

  } catch (error) {
    console.error('Error testing Supabase:', error);
  }
}

testSupabase(); 