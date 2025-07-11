const { createClient } = require('@supabase/supabase-js');

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

async function updateUserDisplayName(userEmail, displayName) {
  try {
    // First, find the user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError.message);
      return;
    }

    const user = users.find(u => u.email === userEmail);
    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      return;
    }

    // Update the user's metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        name: displayName
      }
    });

    if (updateError) {
      console.error('Error updating user:', updateError.message);
      return;
    }

    console.log(`✅ Successfully updated display name for ${userEmail} to "${displayName}"`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example usage
const userEmail = process.argv[2];
const displayName = process.argv[3];

if (!userEmail || !displayName) {
  console.log('Usage: node update-user-display-name.js <email> <display_name>');
  console.log('Example: node update-user-display-name.js admin@stocklab.local "John Doe"');
  process.exit(1);
}

updateUserDisplayName(userEmail, displayName); 