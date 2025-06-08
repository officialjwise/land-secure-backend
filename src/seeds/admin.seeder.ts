// src/seeds/admin.seeder.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

// Load environment variables with explicit path and debug
const envResult = dotenv.config();
if (envResult.error) {
  console.error('Error loading .env file:', envResult.error);
  process.exit(1);
}
console.log('Loaded environment variables:', process.env);

// Validate required variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAdmin() {
  const timestamp = new Date().toISOString();
  try {
    const email = 'admin@landsecure.com';
    const password = await bcrypt.hash('AdminPass123!', 10);
    const id = randomUUID();
    const resetToken = randomUUID();
    const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { data, error } = await supabase
      .from('users')
      .insert({
        id, // Include generated ID
        email,
        password,
        first_name: 'Admin',
        last_name: 'User',
        phone: '+233000000000',
        role: 'admin',
        is_active: true,
        reset_token: resetToken,
        reset_expires_at: resetExpiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`[${timestamp}] Seeded admin user ${email} with ID ${data.id}`);
  } catch (error) {
    console.error(`[${timestamp}] Error seeding admin:`, error);
    process.exit(1);
  }
}

seedAdmin();