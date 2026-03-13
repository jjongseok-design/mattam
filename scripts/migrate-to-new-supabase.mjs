/**
 * 기존 Supabase → 새 Supabase 데이터 이전 스크립트
 *
 * 사용법:
 *   node scripts/migrate-to-new-supabase.mjs
 *
 * 환경변수 (스크립트 상단에서 직접 설정):
 *   OLD_SUPABASE_URL, OLD_SUPABASE_KEY
 *   NEW_SUPABASE_URL, NEW_SUPABASE_KEY (service_role 키 권장)
 */

// ─── 설정 ────────────────────────────────────────────────────────────────────
const OLD_SUPABASE_URL = 'https://qnovapoiqhoextrudsax.supabase.co';
const OLD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFub3ZhcG9pcWhvZXh0cnVkc2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjM4NzUsImV4cCI6MjA4Nzc5OTg3NX0.28ahaT71fgdBQOtFHSnCuwtpajH_J1MDGmZOUqqYHnw';

const NEW_SUPABASE_URL = 'https://cblckdcrsotqynngblyb.supabase.co';
const NEW_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8';
// ─────────────────────────────────────────────────────────────────────────────

const TABLES = ['restaurants', 'reviews', 'review_images', 'review_likes', 'push_subscriptions'];

async function fetchAll(baseUrl, key, table) {
  const res = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=10000`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  ⚠️  ${table} 조회 실패: ${err}`);
    return [];
  }
  return res.json();
}

async function insertAll(baseUrl, key, table, rows) {
  if (rows.length === 0) return;

  // 1000개씩 나눠서 INSERT (너무 크면 실패할 수 있으므로)
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates', // upsert 방식
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`  ❌ ${table} INSERT 실패 (chunk ${i}~${i + chunk.length}): ${err}`);
    } else {
      console.log(`  ✅ ${table}: ${i + chunk.length}/${rows.length} 완료`);
    }
  }
}

async function main() {
  if (NEW_SUPABASE_KEY === 'YOUR_NEW_SERVICE_ROLE_KEY') {
    console.error('❌ NEW_SUPABASE_KEY를 설정해주세요! (스크립트 상단 설정 부분)');
    process.exit(1);
  }

  console.log('🚀 Supabase 데이터 이전 시작\n');
  console.log(`  FROM: ${OLD_SUPABASE_URL}`);
  console.log(`  TO:   ${NEW_SUPABASE_URL}\n`);

  for (const table of TABLES) {
    console.log(`📦 [${table}] 데이터 가져오는 중...`);
    const rows = await fetchAll(OLD_SUPABASE_URL, OLD_SUPABASE_KEY, table);
    console.log(`  → ${rows.length}개 조회됨`);

    if (rows.length > 0) {
      console.log(`  → 새 Supabase에 INSERT 중...`);
      await insertAll(NEW_SUPABASE_URL, NEW_SUPABASE_KEY, table, rows);
    }
    console.log('');
  }

  console.log('✅ 이전 완료!');
}

main().catch(console.error);
