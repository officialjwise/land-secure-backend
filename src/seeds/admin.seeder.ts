import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

async function seedAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const password = await bcrypt.hash('Amoako@21', 10);

  const { data: existingAdmin } = await supabase
    .from('users')
    .select('email')
    .eq('email', 'admin@landsecure.com')
    .single();

  if (!existingAdmin) {
    const { error } = await supabase.from('users').insert({
      email: 'admin@landsecure.com',
      password,
      first_name: 'Admin',
      last_name: 'User',
      phone: '+233123456789',
      role: 'super_admin',
      is_active: true,
    });
    if (error) {
      console.error('Admin seeder error:', error.message);
    } else {
      console.log('Admin user seeded successfully');
    }
  } else {
    console.log('Admin user already exists');
  }
}

seedAdmin().catch(console.error);