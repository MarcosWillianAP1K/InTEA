import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
// O Backend utiliza a SERVICE_ROLE_KEY para operações de servidor com permissão administrativa
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Atenção: SUPABASE_URL ou chaves do Supabase não estão definidas no ambiente.');
}

const noopStorage = {
  getItem: (): null => null,
  setItem: (): void => {},
  removeItem: (): void => {},
};

const isPlaceholderUrl =
  !supabaseUrl ||
  supabaseUrl.includes('placeholder.supabase.co') ||
  supabaseUrl.includes('mock.supabase.co');

const placeholderFetch: typeof fetch = async () => {
  throw new Error('Supabase não configurado: SUPABASE_URL ausente ou placeholder.');
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    ...(isPlaceholderUrl ? { global: { fetch: placeholderFetch } } : {}),
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: noopStorage,
    },
  }
);

// Garante que chamadas a signInWithPassword/verifyOtp no singleton nunca contaminem
// o cabeçalho Authorization (Bearer SERVICE_ROLE_KEY) nas queries PostgREST/Storage.
(supabase.auth as unknown as { storage: typeof noopStorage }).storage = noopStorage;
(supabase as unknown as { accessToken: () => Promise<null> }).accessToken = async () => null;
