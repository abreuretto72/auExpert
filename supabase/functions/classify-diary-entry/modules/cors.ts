/**
 * CORS headers and HTTP response helpers for Edge Functions.
 */

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

/** Preflight response for OPTIONS requests. */
export function corsResponse(): Response {
  return new Response('ok', { headers: CORS_HEADERS });
}

/** JSON success response. */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

/** JSON error response. */
export function errorResponse(error: string, status = 500, extra?: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ error, ...extra }),
    { status, headers: JSON_HEADERS },
  );
}
