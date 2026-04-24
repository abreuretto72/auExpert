import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PET_RELATED_TABLES = [
  'diary_entries',
  'mood_logs',
  'photo_analyses',
  'vaccines',
  'allergies',
  'pet_embeddings',
  'scheduled_events',
  'pet_insights',
  'clinical_metrics',
  'expenses',
  'medications',
  'consultations',
  'surgeries',
  'exams',
  'nutrition_records',
  'pet_connections',
  'pet_plans',
  'achievements',
  'travels',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const petId = body?.pet_id as string | undefined;

    if (!petId) {
      return new Response(
        JSON.stringify({ error: 'pet_id is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the pet belongs to the authenticated user
    const { data: pet, error: petError } = await admin
      .from('pets')
      .select('id, name, user_id')
      .eq('id', petId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (petError || !pet) {
      return new Response(
        JSON.stringify({ error: 'Pet not found or access denied' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Soft-delete all related tables
    const errors: string[] = [];
    for (const table of PET_RELATED_TABLES) {
      const { error } = await admin
        .from(table)
        .update({ is_active: false })
        .eq('pet_id', petId);
      if (error) {
        // Log but continue — some tables may not have is_active or pet_id
        console.warn(`[delete-pet] ${table} update skipped:`, error.message);
        errors.push(table);
      }
    }

    // Soft-delete the pet itself
    const { error: deletePetError } = await admin
      .from('pets')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', petId);

    if (deletePetError) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete pet', details: deletePetError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[delete-pet] SUCCESS — petId:', petId, 'petName:', pet.name, 'userId:', user.id, 'tableErrors:', errors);

    return new Response(
      JSON.stringify({ success: true, pet_name: pet.name }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[delete-pet] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
