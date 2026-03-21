/**
 * 기존 Supabase(restaurantchuncheon) → 새 Supabase(mattam) 데이터 이전
 * 사용법: node scripts/migrate-to-mattam.mjs
 */

const OLD_URL = 'https://cblckdcrsotqynngblyb.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8';

const NEW_URL = 'https://suwvgtidfknbnwgibrjm.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d3ZndGlkZmtuYm53Z2licmptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA1NzUwNiwiZXhwIjoyMDg5NjMzNTA2fQ.1WsqhTYOsmDsKlIU1kldF7zZd0xSCsK9tOrnD9w_6F8';

// 순서 중요: 외래키 의존성 순서대로
const TABLES = [
  'categories',
  'restaurants',
  'reviews',
  'review_images',
  'review_likes',
  'device_visits',
  'device_favorites',
  'tips',
  'push_subscriptions',
];

async function fetchAll(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=10000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  ⚠️  ${table} 조회 실패: ${err}`);
    return [];
  }
  return res.json();
}

async function insertAll(url, key, table, rows) {
  if (rows.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`  ❌ ${table} INSERT 실패 (${i}~${i + chunk.length}): ${err}`);
    } else {
      console.log(`  ✅ ${i + chunk.length}/${rows.length} 완료`);
    }
  }
}

async function main() {
  console.log('🚀 mattam Supabase 데이터 이전 시작\n');
  console.log(`  FROM: ${OLD_URL}`);
  console.log(`  TO:   ${NEW_URL}\n`);

  for (const table of TABLES) {
    console.log(`📦 [${table}] 가져오는 중...`);
    const rows = await fetchAll(OLD_URL, OLD_KEY, table);
    console.log(`  → ${rows.length}개 조회됨`);
    if (rows.length > 0) {
      await insertAll(NEW_URL, NEW_KEY, table, rows);
    }
    console.log('');
  }

  console.log('✅ 이전 완료!');
}

main().catch(console.error);
