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
    // First admin
    const email1 = '';
    const password1 = await bcrypt.hash('Password123!', 10);
    const id1 = randomUUID();
    const resetToken1 = randomUUID();
    const resetExpiresAt1 = new Date(Date.now() + 10 * 60 * 1000);
    const { data: data1, error: error1 } = await supabase
      .from('users')
      .insert({
        id: id1,
        email: email1,
        password: password1,
        first_name: 'Fiifi',
        last_name: 'Yawson',
        phone: '+233543483284',
        role: 'admin',
        is_active: true,
        reset_token: resetToken1,
        reset_expires_at: resetExpiresAt1,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .select()
      .single();
    if (error1) throw error1;
    console.log(`[${timestamp}] Seeded admin user ${email1} with ID ${data1.id}`);

    // Second admin
    const email2 = 'ghyawson@gmail.com';
    const password2 = await bcrypt.hash('Password@123', 10);
    const id2 = randomUUID();
    const resetToken2 = randomUUID();
    const resetExpiresAt2 = new Date(Date.now() + 10 * 60 * 1000);
    const { data: data2, error: error2 } = await supabase
      .from('users')
      .insert({
        id: id2,
        email: email2,
        password: password2,
        first_name: 'Yawson',
        last_name: 'Fiifi',
        phone: '+233000000001',
        role: 'admin',
        is_active: true,
        reset_token: resetToken2,
        reset_expires_at: resetExpiresAt2,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .select()
      .single();
    if (error2) throw error2;
    console.log(`[${timestamp}] Seeded admin user ${email2} with ID ${data2.id}`);
  } catch (error) {
    console.error(`[${timestamp}] Error seeding admin:`, error);
    process.exit(1);
  }
}

seedAdmin();