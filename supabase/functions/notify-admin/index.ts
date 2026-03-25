import nodemailer from "npm:nodemailer@6.9.9";

const ADMIN_EMAIL = "jjongseok@gmail.com";

Deno.serve(async (req) => {
  // Supabase Database Webhook은 POST로 전송
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    const record = payload?.record;

    if (!record) {
      return new Response("No record in payload", { status: 400 });
    }

    const isFeedback = record.category?.startsWith("feedback:");
    const subject = isFeedback
      ? `[맛탐 피드백] ${record.restaurant_name ?? "(제목 없음)"}`
      : `[맛탐 제보] ${record.restaurant_name ?? "(식당명 없음)"}`;

    const bodyLines = isFeedback
      ? [
          `유형: ${record.category?.replace("feedback:", "") ?? "-"}`,
          `제목: ${record.restaurant_name ?? "-"}`,
          `내용: ${record.reason ?? "-"}`,
          `등록 시각: ${record.created_at ?? "-"}`,
        ]
      : [
          `식당명: ${record.restaurant_name ?? "-"}`,
          `카테고리: ${record.category ?? "-"}`,
          `주소/위치: ${record.address ?? "-"}`,
          `추천 이유: ${record.reason ?? "-"}`,
          `등록 시각: ${record.created_at ?? "-"}`,
        ];

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: Deno.env.get("GMAIL_USER"),
        pass: Deno.env.get("GMAIL_APP_PASSWORD"),
      },
    });

    await transporter.sendMail({
      from: `"맛탐 알림" <${Deno.env.get("GMAIL_USER")}>`,
      to: ADMIN_EMAIL,
      subject,
      text: bodyLines.join("\n"),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-admin] error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
