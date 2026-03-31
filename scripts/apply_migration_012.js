const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Aw112233%23110852@db.peqpkzituzpwukzusgcq.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected — applying Sprint 1.1...');

  // 1. Fix missing diary_entries columns
  const diaryAlters = [
    "ADD COLUMN IF NOT EXISTS input_type VARCHAR(30) DEFAULT 'text'",
    "ADD COLUMN IF NOT EXISTS classifications JSONB DEFAULT '[]'",
    "ADD COLUMN IF NOT EXISTS mood_confidence REAL",
    "ADD COLUMN IF NOT EXISTS urgency VARCHAR(10) DEFAULT 'none'",
    "ADD COLUMN IF NOT EXISTS video_url TEXT",
    "ADD COLUMN IF NOT EXISTS video_analysis JSONB",
    "ADD COLUMN IF NOT EXISTS linked_vaccine_id UUID",
  ];
  for (const col of diaryAlters) {
    try {
      await client.query(`ALTER TABLE diary_entries ${col}`);
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('  skip:', e.message.slice(0, 60));
    }
  }
  console.log('diary_entries: columns added');

  // 2. Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_diary_primary_type ON diary_entries(primary_type)',
    'CREATE INDEX IF NOT EXISTS idx_diary_input_type ON diary_entries(input_type)',
    'CREATE INDEX IF NOT EXISTS idx_diary_classifications ON diary_entries USING GIN(classifications)',
  ];
  for (const idx of indexes) {
    try { await client.query(idx); } catch (e) { console.log('  idx skip:', e.message.slice(0, 50)); }
  }
  console.log('diary_entries: indexes created');

  // 3. Migrate existing data
  await client.query("UPDATE diary_entries SET input_type = COALESCE(input_method, 'text') WHERE input_type = 'text' AND input_method IS DISTINCT FROM 'text'");
  await client.query("UPDATE diary_entries SET primary_type = 'vaccine' WHERE entry_type = 'vaccine' AND primary_type = 'moment'");
  await client.query("UPDATE diary_entries SET primary_type = 'allergy' WHERE entry_type = 'allergy' AND primary_type = 'moment'");
  await client.query("UPDATE diary_entries SET input_type = 'photo' WHERE entry_type = 'photo_analysis' AND input_type = 'text'");
  console.log('diary_entries: data migrated');

  // 4. clinical_metrics
  await client.query(`
    CREATE TABLE IF NOT EXISTS clinical_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      diary_entry_id UUID REFERENCES diary_entries(id),
      exam_id UUID,
      metric_type VARCHAR(30) NOT NULL,
      value DECIMAL(10,3) NOT NULL,
      unit VARCHAR(20),
      reference_min DECIMAL(10,3),
      reference_max DECIMAL(10,3),
      status VARCHAR(20) DEFAULT 'normal',
      source VARCHAR(20) DEFAULT 'manual',
      measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_metrics_pet ON clinical_metrics(pet_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_metrics_type ON clinical_metrics(metric_type)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_metrics_pet_type_date ON clinical_metrics(pet_id, metric_type, measured_at DESC)');
  await client.query('ALTER TABLE clinical_metrics ENABLE ROW LEVEL SECURITY');
  try {
    await client.query("CREATE POLICY metrics_own_data ON clinical_metrics FOR ALL USING (user_id = auth.uid())");
  } catch (e) { /* already exists */ }
  console.log('clinical_metrics: CREATED');

  // 5. app_config
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      description TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`
    INSERT INTO app_config (key, value, description) VALUES
      ('classification_threshold', '"0.5"', 'Min confidence to classify'),
      ('suggestion_threshold', '"0.7"', 'Min confidence to suggest module'),
      ('max_photos_per_entry', '5', 'Max photos per entry'),
      ('max_video_seconds', '60', 'Max video duration'),
      ('narration_style', '"third_person"', 'Narration style'),
      ('narration_max_words', '150', 'Max narration words')
    ON CONFLICT (key) DO NOTHING
  `);
  console.log('app_config: CREATED + seeded');

  // 6. metric_references
  await client.query(`
    CREATE TABLE IF NOT EXISTS metric_references (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      species VARCHAR(10) NOT NULL,
      breed VARCHAR(80),
      size VARCHAR(20),
      age_min_months INTEGER,
      age_max_months INTEGER,
      metric_type VARCHAR(30) NOT NULL,
      reference_min DECIMAL(10,3) NOT NULL,
      reference_max DECIMAL(10,3) NOT NULL,
      unit VARCHAR(20) NOT NULL,
      notes TEXT
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_metric_ref ON metric_references(species, metric_type)');
  const refCount = await client.query('SELECT COUNT(*) as c FROM metric_references');
  if (parseInt(refCount.rows[0].c) === 0) {
    await client.query(`
      INSERT INTO metric_references (species, size, metric_type, reference_min, reference_max, unit, notes) VALUES
        ('dog', 'small', 'weight', 2, 10, 'kg', 'Small dogs'),
        ('dog', 'medium', 'weight', 10, 25, 'kg', 'Medium dogs'),
        ('dog', 'large', 'weight', 25, 45, 'kg', 'Large dogs'),
        ('cat', NULL, 'weight', 3, 6, 'kg', 'Adult cats'),
        ('dog', NULL, 'temperature', 38.0, 39.2, 'C', 'Normal temp'),
        ('cat', NULL, 'temperature', 38.0, 39.5, 'C', 'Normal temp'),
        ('dog', NULL, 'heart_rate', 60, 140, 'bpm', 'Resting HR'),
        ('cat', NULL, 'heart_rate', 120, 220, 'bpm', 'Resting HR')
    `);
  }
  console.log('metric_references: CREATED + seeded');

  // 7. View
  await client.query(`
    CREATE OR REPLACE VIEW vw_pet_health_summary_v2 AS
    SELECT
      p.id AS pet_id, p.name, p.health_score, p.current_mood, p.weight_kg AS current_weight,
      (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND v.next_due_date < CURRENT_DATE AND v.is_active = TRUE) AS vaccines_overdue,
      (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND (v.next_due_date IS NULL OR v.next_due_date >= CURRENT_DATE) AND v.is_active = TRUE) AS vaccines_ok,
      (SELECT COUNT(*) FROM allergies a WHERE a.pet_id = p.id AND a.is_active = TRUE) AS allergies_count,
      (SELECT cm.value FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.metric_type = 'weight' AND cm.is_active = TRUE ORDER BY cm.measured_at DESC LIMIT 1) AS last_weight,
      (SELECT COUNT(*) FROM diary_entries d WHERE d.pet_id = p.id AND d.is_active = TRUE) AS diary_count
    FROM pets p WHERE p.is_active = TRUE
  `);
  console.log('vw_pet_health_summary_v2: CREATED');

  // === FINAL VERIFICATION ===
  const finalCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'diary_entries' ORDER BY ordinal_position");
  console.log('\n=== diary_entries: ' + finalCols.rows.length + ' columns ===');
  console.log(finalCols.rows.map(r => r.column_name).join(', '));

  for (const t of ['clinical_metrics', 'app_config', 'metric_references']) {
    const res = await client.query('SELECT COUNT(*) as c FROM ' + t);
    console.log(t + ': ' + res.rows[0].c + ' rows');
  }

  const migrated = await client.query("SELECT primary_type, COUNT(*) as c FROM diary_entries GROUP BY primary_type");
  console.log('diary data:', migrated.rows.map(r => r.primary_type + ':' + r.c).join(', '));

  await client.end();
  console.log('\n✓ Sprint 1.1 COMPLETE!');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
