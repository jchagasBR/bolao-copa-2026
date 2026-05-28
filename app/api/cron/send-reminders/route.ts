import { NextRequest } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { createServiceClient } from "@/lib/supabase/service";
import { BetReminderEmail } from "@/emails/bet-reminder";

// Vercel cron declares this in vercel.json; runs hourly. Also callable
// manually for local testing with the same Bearer token.
//
// Logic per requirements §3 and architecture §7:
//  - For every (user, match) where the match kicks off in the next 12-24h,
//    and the user is a member of at least one pool, and the user has no
//    bet_match for that match in any pool they belong to, and the user has
//    not opted out of reminders, and we have not already sent a reminder for
//    that (user, match) pair → send the email.
//  - kickoff_at > now() guard makes the "future match" check safe even if
//    the cron runs late.
//  - The reminder_sent table dedupes across runs.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAO_PAULO_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Oitavas (R32)",
  r16: "16-avos (R16)",
  qf: "Quartas",
  sf: "Semi",
  third: "Disputa de 3º",
  final: "Final",
};

type MatchRow = {
  id: string;
  stage: string;
  group_code: string | null;
  kickoff_at: string;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type MissingPredictionRow = {
  user_id: string;
  email: string;
  name: string;
};

type SendResult = {
  match_id: string;
  user_id: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
};

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return Response.json({ error: "resend_api_key_missing" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const resend = new Resend(resendKey);

  // Window: now+12h .. now+24h. Hourly cron runs at :00 every hour, so each
  // match enters the window for 12 consecutive runs. The reminder_sent dedup
  // is what keeps each user from getting 12 copies.
  const now = new Date();
  const windowStart = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1) Pull every match in the window with both teams populated.
  // kickoff_at > now() guard is implicit since windowStart > now(), but kept
  // explicit in the comment so the next reader doesn't relax the window.
  const { data: matches, error: matchErr } = await supabase
    .from("match")
    .select(
      "id, stage, group_code, kickoff_at, home_team:home_team_id (name), away_team:away_team_id (name)",
    )
    .gte("kickoff_at", windowStart.toISOString())
    .lte("kickoff_at", windowEnd.toISOString())
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .returns<MatchRow[]>();

  if (matchErr) {
    return Response.json({ error: "match_query_failed", detail: matchErr.message }, { status: 500 });
  }
  if (!matches || matches.length === 0) {
    return Response.json({ window: { start: windowStart, end: windowEnd }, matches: 0, sent: 0, results: [] });
  }

  const results: SendResult[] = [];
  let sentCount = 0;

  for (const match of matches) {
    // 2) For this match: every pool member (in any pool) who has not bet on
    // it in any of their pools, not opted out, and not already reminded.
    const { data: missing, error: missingErr } = await supabase.rpc(
      "users_missing_prediction",
      { p_match_id: match.id },
    );

    if (missingErr) {
      results.push({
        match_id: match.id,
        user_id: "",
        status: "failed",
        reason: `users_missing_prediction: ${missingErr.message}`,
      });
      continue;
    }

    const rows = (missing ?? []) as MissingPredictionRow[];
    if (rows.length === 0) continue;

    const kickoffSaoPaulo = capitaliseFirst(
      SAO_PAULO_FORMATTER.format(new Date(match.kickoff_at)),
    );
    const hoursUntilKickoff = Math.max(
      1,
      Math.round((new Date(match.kickoff_at).getTime() - now.getTime()) / 3_600_000),
    );
    const stageLabel = match.group_code
      ? `Grupo ${match.group_code}`
      : (STAGE_LABELS[match.stage] ?? match.stage);
    const matchUrl = `${appUrl}/jogos/${match.id}`;
    const homeName = match.home_team?.name ?? "A definir";
    const awayName = match.away_team?.name ?? "A definir";

    for (const row of rows) {
      try {
        const html = await render(
          BetReminderEmail({
            recipientName: row.name,
            homeTeam: homeName,
            awayTeam: awayName,
            stageLabel,
            kickoffSaoPaulo,
            hoursUntilKickoff,
            matchUrl,
          }),
        );

        const subject = `Você ainda não palpitou: ${homeName} × ${awayName}`;
        const { error: sendErr } = await resend.emails.send({
          from: fromEmail,
          to: row.email,
          subject,
          html,
        });

        if (sendErr) {
          results.push({
            match_id: match.id,
            user_id: row.user_id,
            status: "failed",
            reason: sendErr.message,
          });
          continue;
        }

        // Record the send so future cron runs don't duplicate. If the insert
        // races with another concurrent run, the (user_id, match_id) PK will
        // reject the duplicate and we treat that as a benign "already sent".
        const { error: insertErr } = await supabase.from("reminder_sent").insert({
          user_id: row.user_id,
          match_id: match.id,
        });
        if (insertErr && !insertErr.message.includes("duplicate key")) {
          results.push({
            match_id: match.id,
            user_id: row.user_id,
            status: "failed",
            reason: `reminder_sent insert: ${insertErr.message}`,
          });
          continue;
        }

        sentCount++;
        results.push({ match_id: match.id, user_id: row.user_id, status: "sent" });
      } catch (err) {
        results.push({
          match_id: match.id,
          user_id: row.user_id,
          status: "failed",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return Response.json({
    window: { start: windowStart, end: windowEnd },
    matches: matches.length,
    sent: sentCount,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}

function capitaliseFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
