const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars. Run: source .env.local && node scripts/test_classify.js');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Login
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'abreu@multiversodigital.com.br',
    password: 'Aw112233#',
  });
  if (authErr || !auth?.session) {
    console.error('Auth failed:', authErr?.message);
    return;
  }
  console.log('Authenticated:', auth.user.email);

  // Get pet
  const { data: pets } = await supabase.from('pets').select('id, name').limit(1);
  if (!pets?.length) { console.log('No pets'); return; }
  const petId = pets[0].id;
  console.log('Pet:', pets[0].name, petId);

  // Test 1: Simple text
  console.log('\n=== TEST 1: Simple moment ===');
  const { data: r1, error: e1 } = await supabase.functions.invoke('classify-diary-entry', {
    body: { pet_id: petId, text: 'Rex brincou no parque hoje, estava muito feliz', language: 'pt-BR' },
  });
  if (e1) { console.error('ERROR:', e1); }
  else {
    console.log('primary:', r1.primary_type, '| mood:', r1.mood, '(' + r1.mood_confidence + ')', '| urgency:', r1.urgency);
    console.log('narration:', r1.narration?.slice(0, 150));
    console.log('tags:', r1.tags_suggested);
  }

  // Test 2: Multi-item
  console.log('\n=== TEST 2: Vet + vaccine + weight ===');
  const { data: r2, error: e2 } = await supabase.functions.invoke('classify-diary-entry', {
    body: { pet_id: petId, text: 'Voltei do veterinario, Rex tomou V10 na Dra Carla, pesou 32 quilos', input_type: 'voice', language: 'pt-BR' },
  });
  if (e2) { console.error('ERROR:', e2); }
  else {
    console.log('primary:', r2.primary_type, '| classifications:', r2.classifications?.length);
    (r2.classifications || []).forEach(c => console.log('  -', c.type, (c.confidence || 0).toFixed(2), JSON.stringify(c.extracted_data || {}).slice(0, 100)));
    console.log('metrics:', (r2.clinical_metrics || []).map(m => m.type + '=' + m.value + m.unit));
    console.log('suggestions:', r2.suggestions);
    console.log('narration:', r2.narration?.slice(0, 150));
  }

  // Test 3: Urgency
  console.log('\n=== TEST 3: Urgency ===');
  const { data: r3, error: e3 } = await supabase.functions.invoke('classify-diary-entry', {
    body: { pet_id: petId, text: 'Rex esta com diarreia ha 2 dias e nao quer comer nada', language: 'pt-BR' },
  });
  if (e3) { console.error('ERROR:', e3); }
  else {
    console.log('primary:', r3.primary_type, '| mood:', r3.mood, '| urgency:', r3.urgency);
    console.log('suggestions:', r3.suggestions);
    console.log('narration:', r3.narration?.slice(0, 150));
  }

  console.log('\n✓ Tests complete');
}

test().catch(e => console.error('FATAL:', e.message));
