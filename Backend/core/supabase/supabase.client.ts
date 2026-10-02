import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
// O Backend utiliza a SERVICE_ROLE_KEY para operações de servidor com permissão administrativa
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Atenção: SUPABASE_URL ou chaves do Supabase não estão definidas no ambiente.');
}

/**
 * Supabase client instance configured with service role or anon key.
 * Used across the backend services and models for database interactions and authentication.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);
