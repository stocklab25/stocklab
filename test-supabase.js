const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ikehagqphpbpkbgynrvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWhhZ3FwaHBicGtiZ3lucnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDQ3MjUsImV4cCI6MjA2NzIyMDcyNX0.ApP-PIxxws3MC60R30d88jhWQmHAPDnuPYO7ehPMHp0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try to query the database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error:', error.message);
      if (error.message.includes('relation "users" does not exist')) {
        console.log('✅ Supabase connection works! The users table just doesn\'t exist yet.');
      } else {
        console.log('❌ Supabase connection failed:', error.message);
      }
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.log('❌ Connection test failed:', err.message);
  }
}

testConnection(); 