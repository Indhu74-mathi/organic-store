import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client for Server-Side Operations
 * 
 * Uses service role key for server-side operations.
 * This client bypasses Row Level Security (RLS) policies.
 * 
 * SECURITY: Never expose SUPABASE_SERVICE_ROLE_KEY to client-side code.
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (server-only)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

/**
 * Create Supabase admin client with service role key
 * This client has full access to the database (bypasses RLS)
 * Use this for server-side auth operations (signUp, signInWithPassword)
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

