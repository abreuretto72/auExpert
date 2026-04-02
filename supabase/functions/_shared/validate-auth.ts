/**
 * Shared JWT validation helper for Supabase Edge Functions.
 * Returns the authenticated user ID or responds with 401.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const UNAUTHORIZED = (headers: Record<string, string>) =>
  new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } },
  );

/**
 * Validates the Bearer JWT from the Authorization header.
 * Returns { userId } on success, or a 401 Response on failure.
 */
export async function validateAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return UNAUTHORIZED(corsHeaders);
  }

  const token = authHeader.replace('Bearer ', '');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return UNAUTHORIZED(corsHeaders);
  }

  return { userId: user.id };
}
