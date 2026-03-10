/**
 * Real-time open/closed status utility.
 *
 * RULES for accuracy:
 * 1. Only returns a status when opening_hours data exists.
 * 2. closed_days is checked against Korean day names.
 * 3. If data is ambiguous or missing → returns "unknown" (no indicator shown).
 */

export type OpenStatus = "open" | "closed" | "unknown";

const DAY_NAMES_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const DAY_SHORT_KO = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Parse "HH:MM~HH:MM" or "HH:MM ~ HH:MM" into [startMinutes, endMinutes]
 */
function parseTimeRange(hours: string): [number, number] | null {
  const match = hours.trim().match(/^(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const startMin = parseInt(match[1]) * 60 + parseInt(match[2]);
  const endMin = parseInt(match[3]) * 60 + parseInt(match[4]);
  return [startMin, endMin];
}

/**
 * Check if today is a closed day.
 * Supports: "일요일", "일", "월요일, 화요일", "월,화", etc.
 */
function isTodayClosed(closedDays: string): boolean {
  const today = new Date();
  const dayIndex = today.getDay(); // 0=Sun
  const todayFull = DAY_NAMES_KO[dayIndex]; // "일요일"
  const todayShort = DAY_SHORT_KO[dayIndex]; // "일"

  // Split by comma, space, or slash and check each token
  const tokens = closedDays
    .split(/[,\s/·]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return tokens.some(
    (t) => t === todayFull || t === todayShort || t === `${todayShort}요일`
  );
}

/**
 * Determine the open/closed status of a restaurant right now.
 */
export function getOpenStatus(
  openingHours?: string | null,
  closedDays?: string | null
): OpenStatus {
  // No data → unknown (don't guess)
  if (!openingHours) return "unknown";

  // Check closed day first
  if (closedDays && isTodayClosed(closedDays)) {
    return "closed";
  }

  const range = parseTimeRange(openingHours);
  if (!range) return "unknown"; // unparseable format

  const [startMin, endMin] = range;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Handle overnight hours (e.g. 18:00~02:00)
  if (endMin <= startMin) {
    // Open if after start OR before end
    return nowMin >= startMin || nowMin < endMin ? "open" : "closed";
  }

  return nowMin >= startMin && nowMin < endMin ? "open" : "closed";
}

/**
 * Returns a human-readable label and color config for UI display.
 */
export function getOpenStatusLabel(status: OpenStatus) {
  switch (status) {
    case "open":
      return { text: "영업중", dotClass: "bg-green-500", textClass: "text-green-600 dark:text-green-400" };
    case "closed":
      return { text: "영업종료", dotClass: "bg-red-500", textClass: "text-red-500 dark:text-red-400" };
    default:
      return null; // Don't show anything for unknown
  }
}
