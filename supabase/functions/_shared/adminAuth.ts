import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthResult {
  success: boolean;
  response?: Response;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Verifies the admin PIN against the database, enforcing brute-force lockout.
 * Returns { success: true } or { success: false, response } where response is the HTTP error to return.
 */
export async function verifyAdminPin(
  supabase: SupabaseClient,
  pin: string,
  ipHint: string
): Promise<AuthResult> {
  const lockoutCutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

  // Check lockout before PIN lookup
  const { data: recentAttempts } = await supabase
    .from("admin_login_attempts")
    .select("id")
    .eq("ip_hint", ipHint)
    .eq("success", false)
    .gte("attempted_at", lockoutCutoff);

  if (recentAttempts && recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
    return {
      success: false,
      response: jsonResponse(
        { success: false, error: `너무 많은 로그인 시도입니다. ${LOCKOUT_MINUTES}분 후에 다시 시도해주세요.`, locked: true },
        429
      ),
    };
  }

  // Load stored PIN
  const { data: settings, error: settingsErr } = await supabase
    .from("admin_settings")
    .select("pin_hash")
    .eq("id", "default")
    .single();

  if (settingsErr || !settings) {
    return { success: false, response: jsonResponse({ success: false, error: "설정을 불러올 수 없습니다" }, 500) };
  }

  if (pin !== settings.pin_hash) {
    await supabase.from("admin_login_attempts").insert({ ip_hint: ipHint, success: false });

    const { data: updatedAttempts } = await supabase
      .from("admin_login_attempts")
      .select("id")
      .eq("ip_hint", ipHint)
      .eq("success", false)
      .gte("attempted_at", lockoutCutoff);

    const remaining = MAX_LOGIN_ATTEMPTS - (updatedAttempts?.length || 0);
    return {
      success: false,
      response: jsonResponse(
        {
          success: false,
          error: remaining > 0
            ? `PIN이 일치하지 않습니다 (${remaining}회 남음)`
            : `너무 많은 로그인 시도입니다. ${LOCKOUT_MINUTES}분 후에 다시 시도해주세요.`,
          locked: remaining <= 0,
        },
        401
      ),
    };
  }

  // Success — record attempt and return
  await supabase.from("admin_login_attempts").insert({ ip_hint: ipHint, success: true });
  return { success: true };
}
