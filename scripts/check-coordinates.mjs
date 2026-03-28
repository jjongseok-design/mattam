import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

function parseEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => { const idx = l.indexOf("="); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]; })
    );
  } catch { return {}; }
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...parseEnvFile(resolve(ROOT, ".env")), ...parseEnvFile(resolve(ROOT, ".env.local")), ...process.env };

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { data: restaurants } = await supabase.from("restaurants").select("id, name, address, lat, lng").limit(20);

for (const r of restaurants) {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${r.lat}&lon=${r.lng}&format=json&accept-language=ko`, {
    headers: { "User-Agent": "mattam-dev-script/1.0 (local testing)" }
  });
  const data = await res.json();
  const reversedAddress = data.display_name ?? "주소 없음";
  const match = reversedAddress.includes(r.address.slice(0, 5));
  console.log(`${match ? "✅" : "❌"} ${r.name}`);
  console.log(`   DB 주소: ${r.address}`);
  console.log(`   좌표 주소: ${reversedAddress}`);
  console.log();
  await new Promise(r => setTimeout(r, 1000));
}
