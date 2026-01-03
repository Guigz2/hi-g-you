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
  parent_id?: string | null;
  id?: string;
  old_only?: boolean;
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
    parent_id: (searchParams.has("parent_id") ? (searchParams.get("parent_id") || null) : undefined) as any,
    id: (searchParams.get("id") as any) || undefined,
    old_only: searchParams.has("old_only") && (["1","true","yes"]).includes(String(searchParams.get("old_only")).toLowerCase()),
  };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([]);
    let q = supabase.from("tasks").select("*").eq("user_id", user.id);
    if (filters.id) {
      q = q.eq("id", filters.id);
    }
    // Prefer sibling ordering if present
    q = q.order("order_index", { ascending: true }).order("created_at", { ascending: false });
    if (filters.scope) q = q.eq("scope", filters.scope);
    if (filters.type && filters.type !== "tous") q = q.eq("type", filters.type);
    if (filters.importance && filters.importance !== "tous") q = q.eq("importance", filters.importance);
    if (filters.status && filters.status !== "tous") q = q.eq("status", filters.status);
    if (filters.location && filters.location !== "tous") q = q.eq("location", filters.location);
    if (filters.duration && filters.duration !== "tous") q = q.eq("duration", filters.duration);
    if (!filters.id) {
      if (filters.parent_id !== undefined) q = filters.parent_id === null ? q.is("parent_id", null) : q.eq("parent_id", filters.parent_id);
    }
    // Exclude finished tasks older than 24h by default (when no explicit status filter);
    // Support old-only mode to show only archived finished tasks.
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (filters.old_only) {
      q = q.eq("status", "fini").lte("completed_at", threshold);
    } else if (!filters.status || filters.status === "tous") {
      // Show non-finished OR finished with completed_at in the last 24h
      q = q.or(`status.in.(a_faire,en_cours),and(status.eq.fini,completed_at.gt.${threshold})`);
    }
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
      "parent_id",
      "order_index",
    ];
    const update: Record<string, any> = {};
    for (const k of allowedKeys) {
      if (k in body && body[k] !== undefined) update[k] = body[k];
    }
    // Basic cycle guard: cannot be its own parent
    if (update.parent_id && String(update.parent_id) === id) {
      return NextResponse.json({ error: "Une tâche ne peut pas être son propre parent" }, { status: 400 });
    }
    // type is already a new label; DB constraint must be migrated before removing mapping
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // If status is being updated, set/unset completed_at accordingly
    if ("status" in update) {
      if (String(update.status) === "fini") {
        update.completed_at = new Date().toISOString();
      } else {
        update.completed_at = null;
      }
    }
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
    const parentId: string | null = body.parent_id ? String(body.parent_id) : null;
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
      parent_id: parentId,
      order_index: 0,
    };
    if (!payload.title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    // Compute sibling next order_index when creating under a parent
    if (parentId !== null) {
      const { data: siblings, error: sibErr } = await supabase
        .from("tasks")
        .select("order_index")
        .eq("user_id", user.id)
        .eq("parent_id", parentId)
        .order("order_index", { ascending: false })
        .limit(1);
      if (sibErr) throw new Error(sibErr.message);
      const nextIndex = siblings && siblings.length ? (Number(siblings[0].order_index) + 1) : 0;
      payload.order_index = nextIndex;
    }
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
    // Load all tasks for user to compute subtree under the target id
    const { data: allTasks, error: fetchErr } = await supabase
      .from("tasks")
      .select("id,parent_id")
      .eq("user_id", user.id);
    if (fetchErr) throw new Error(fetchErr.message);

    // Build adjacency map: parent -> children ids
    const byParent = new Map<string, string[]>();
    for (const t of (allTasks || [])) {
      if (t.parent_id) {
        const arr = byParent.get(t.parent_id) || [];
        arr.push(t.id as string);
        byParent.set(t.parent_id as string, arr);
      }
    }
    // Collect subtree ids (including the target id)
    const idsToDelete = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const pid = stack.pop()!;
      if (!idsToDelete.has(pid)) {
        idsToDelete.add(pid);
        const kids = byParent.get(pid) || [];
        for (const k of kids) stack.push(k);
      }
    }
    // Execute cascade delete
    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", Array.from(idsToDelete))
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, deleted: Array.from(idsToDelete) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}
