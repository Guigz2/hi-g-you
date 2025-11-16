import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return undefined;
  const [type, token] = auth.split(" ");
  if (type?.toLowerCase() !== "bearer") return undefined;
  return token?.trim();
}

export async function GET(req: Request) {
  return applyMonthly(req);
}

export async function POST(req: Request) {
  return applyMonthly(req);
}

async function applyMonthly(req: Request) {
  const url = new URL(req.url);
  const secretFromHeader = getBearerToken(req);
  const secretFromQuery = url.searchParams.get("secret") || undefined;
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || (secretFromHeader !== expectedSecret && secretFromQuery !== expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Period boundaries: first day of current month (UTC) for consistency
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const periodStartISO = periodStart.toISOString().slice(0, 10); // yyyy-mm-dd
  const nextMonthStartISO = nextMonthStart.toISOString().slice(0, 10);

  // Fetch monthly payments
  const { data: rows, error: fetchError } = await supabase
    .from("monthly_payment")
    .select("id, desc, amount, category, type, user_id");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let inserted = 0;
  let skipped = 0;
  const errors: Array<{ id: string; message: string }> = [];

  for (const p of rows || []) {
    const isCredit = (p.type || "").toLowerCase() === "crédit" || (p.type || "").toLowerCase() === "credit";
    const table = isCredit ? "credits" : "transactions";
    const userId = (p as any).user_id;

    // We prefix applied descriptions with "M-"; check duplicates against both prefixed and original
    const descWithPrefix = (p.desc || "").startsWith("M-") ? p.desc : `M-${p.desc}`;

    // Check duplicate within month by desc+category+amount (prefixed)
    let existing: any = null;
    let existErr: any = null;
    {
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .gte("date", periodStartISO)
        .lt("date", nextMonthStartISO)
        .eq("desc", descWithPrefix)
        .eq("category", p.category)
        .eq("amount", p.amount)
        .eq("user_id", userId)
        .maybeSingle();
      existing = data;
      existErr = error;
    }
    // If not found, also check legacy records without prefix
    if (!existing) {
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .gte("date", periodStartISO)
        .lt("date", nextMonthStartISO)
        .eq("desc", p.desc)
        .eq("category", p.category)
        .eq("amount", p.amount)
        .eq("user_id", userId)
        .maybeSingle();
      existing = data;
      existErr = existErr || error;
    }

    if (existErr) {
      errors.push({ id: String(p.id), message: existErr.message });
      continue;
    }

    if (existing) {
      skipped++;
      continue;
    }

    const payload = {
      desc: descWithPrefix,
      amount: typeof p.amount === "string" ? parseFloat(p.amount) : p.amount,
      category: p.category,
      date: periodStartISO,
      user_id: userId,
    };

    const { error: insertErr } = await supabase.from(table).insert([payload]);
    if (insertErr) {
      errors.push({ id: String(p.id), message: insertErr.message });
      continue;
    }
    inserted++;
  }

  return NextResponse.json({ periodStart: periodStartISO, inserted, skipped, errors });
}
