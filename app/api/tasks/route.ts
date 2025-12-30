import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Status = "a_faire" | "en_cours" | "fini";
type TaskFilters = {
  scope?: "perso" | "travail";
  type?: string;
  importance?: string;
  status?: string;
  location?: string;
  duration?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters: TaskFilters = {
    scope: (searchParams.get("scope") as any) || undefined,
    type: (searchParams.get("type") as any) || undefined,
    importance: (searchParams.get("importance") as any) || undefined,
    status: (searchParams.get("status") as any) || undefined,
    location: (searchParams.get("location") as any) || undefined,
    duration: (searchParams.get("duration") as any) || undefined,
  };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([]);
    let q = supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (filters.scope) q = q.eq("scope", filters.scope);
    if (filters.type && filters.type !== "tous") q = q.eq("type", filters.type);
    if (filters.importance && filters.importance !== "tous") q = q.eq("importance", filters.importance);
    if (filters.status && filters.status !== "tous") q = q.eq("status", filters.status);
    if (filters.location && filters.location !== "tous") q = q.eq("location", filters.location);
    if (filters.duration && filters.duration !== "tous") q = q.eq("duration", filters.duration);
    const { data, error } = await q;
    if (error) {
      // If table doesn't exist yet, return empty array (setup not completed)
      const code = (error as any)?.code;
      if (code === "42P01" || /does not exist/i.test(error.message)) {
        return NextResponse.json([]);
      }
      throw new Error(error.message);
    }
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    const allowedKeys = [
      "status",
      "title",
      "scope",
      "type",
      "importance",
      "location",
      "duration",
      "due_date",
      "notes",
    ];
    const update: Record<string, any> = {};
    for (const k of allowedKeys) {
      if (k in body && body[k] !== undefined) update[k] = body[k];
    }
    // type is already a new label; DB constraint must be migrated before removing mapping
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { error } = await supabase.from("tasks").update(update).match({ id, user_id: user.id });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const payload = {
      user_id: user.id,
      title: String(body.title || "").trim(),
      scope: String(body.scope || "perso"),
      type: String(body.type || "tous").replace(/^tous$/, "Loisir"),
      importance: String(body.importance || "moyenne"),
      status: String(body.status || "a_faire"),
      location: String(body.location || "partout"),
      duration: String(body.duration || "courte"),
      due_date: body.due_date ? String(body.due_date) : null,
      notes: body.notes ? String(body.notes) : null,
    };
    if (!payload.title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    const { data, error } = await supabase.from("tasks").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data!.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { error } = await supabase.from("tasks").delete().match({ id, user_id: user.id });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}
