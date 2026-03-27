import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const envBase = parseEnvFile(resolve(ROOT, ".env"));
const key = process.env.ANTHROPIC_API_KEY || envBase.ANTHROPIC_API_KEY;

console.log("키 앞 20자:", key?.slice(0, 20));
console.log("키 전체 길이:", key?.length);
console.log("키 뒤 10자:", key?.slice(-10));

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 10,
    messages: [{ role: "user", content: "hi" }],
  }),
});

const data = await res.json();
console.log("HTTP 상태:", res.status);
console.log("응답:", JSON.stringify(data).slice(0, 200));
