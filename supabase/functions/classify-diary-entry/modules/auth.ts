/**
 * Authentication module — validates JWT from the request Authorization header.
 * Returns the authenticated user_id or throws.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Validate the JWT token from the Authorization header.
 * Returns the authenticated user or null if invalid.
 */
export async function validateAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('[auth] JWT validation failed:', error?.message);
    return null;
  }

  return { id: user.id, email: user.email };
}
