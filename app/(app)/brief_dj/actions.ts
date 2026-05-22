"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Briefing, BriefingData, BriefingListRow } from "./types";
import { hydrateBriefing } from "./types";

export async function listBriefings(): Promise<BriefingListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("briefings")
    .select("id,title,wedding_date,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as BriefingListRow[];
}

export async function getBriefing(id: string): Promise<Briefing | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(error.message);
  }
  return hydrateBriefing(data as Partial<Briefing>);
}

export interface UpsertInput {
  id?: string | null;
  title: string;
  wedding_date: string | null;
  data: BriefingData;
  saved: Record<string, string>;
}

export async function upsertBriefing(input: UpsertInput): Promise<Briefing> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const now = new Date().toISOString();
  const payload = {
    user_id: user.id,
    title: input.title || "",
    wedding_date: input.wedding_date || null,
    data: input.data,
    saved: input.saved,
    updated_at: now,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("briefings")
      .update(payload)
      .match({ id: input.id, user_id: user.id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/brief_dj");
    return hydrateBriefing(data as Partial<Briefing>);
  }

  const { data, error } = await supabase
    .from("briefings")
    .insert({ ...payload, created_at: now })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/brief_dj");
  return hydrateBriefing(data as Partial<Briefing>);
}

export async function deleteBriefing(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { error } = await supabase
    .from("briefings")
    .delete()
    .match({ id, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/brief_dj");
}
