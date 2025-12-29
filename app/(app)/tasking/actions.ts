"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Scope = "perso" | "travail";
export type TaskType = "loisir" | "menage" | "travail";
export type Importance = "petite" | "moyenne" | "grande" | "urgente";
export type Status = "a_faire" | "en_cours" | "fini";
export type Location = "partout" | "maison" | "travail";
export type Duration = "courte" | "moyenne" | "longue";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  scope: Scope;
  type: TaskType;
  importance: Importance;
  status: Status;
  location: Location;
  duration: Duration;
  due_date: string | null; // ISO date
  notes: string | null;
  created_at: string;
}

export interface TaskFilters {
  scope?: Scope;
  type?: TaskType | "tous";
  importance?: Importance | "tous";
  status?: Status | "tous";
  location?: Location | "tous";
  duration?: Duration | "tous";
}

export async function listTasks(filters: TaskFilters): Promise<Task[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let q = supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (filters.scope) q = q.eq("scope", filters.scope);
  if (filters.type && filters.type !== "tous") q = q.eq("type", filters.type);
  if (filters.importance && filters.importance !== "tous") q = q.eq("importance", filters.importance);
  if (filters.status && filters.status !== "tous") q = q.eq("status", filters.status);
  if (filters.location && filters.location !== "tous") q = q.eq("location", filters.location);
  if (filters.duration && filters.duration !== "tous") q = q.eq("duration", filters.duration);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as Task[];
}

export interface CreateTaskInput {
  title: string;
  scope: Scope;
  type: TaskType;
  importance: Importance;
  status: Status;
  location: Location;
  duration: Duration;
  due_date?: string | null;
  notes?: string | null;
}

export async function createTask(input: CreateTaskInput) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const payload = { ...input, user_id: user.id, due_date: input.due_date || null, notes: input.notes || null };
  const { data, error } = await supabase.from("tasks").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data!.id };
}

export async function updateTask(id: string, patch: Partial<CreateTaskInput>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { error } = await supabase.from("tasks").update(patch).match({ id, user_id: user.id });
  if (error) throw new Error(error.message);
  return { id };
}

export async function updateTaskStatus(id: string, status: Status) {
  return updateTask(id, { status });
}

export async function deleteTask(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { error } = await supabase.from("tasks").delete().match({ id, user_id: user.id });
  if (error) throw new Error(error.message);
  return { id };
}

export async function statsByImportance(filters: TaskFilters) {
  const tasks = await listTasks(filters);
  const groups: Record<Importance, { a_faire: number; en_cours: number; fini: number }> = {
    petite: { a_faire: 0, en_cours: 0, fini: 0 },
    moyenne: { a_faire: 0, en_cours: 0, fini: 0 },
    grande: { a_faire: 0, en_cours: 0, fini: 0 },
    urgente: { a_faire: 0, en_cours: 0, fini: 0 },
  };
  for (const t of tasks) {
    groups[t.importance][t.status]++ as any;
  }
  return groups;
}

// SQL helper for Supabase (documentation)
export const TASKS_SQL = `
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  scope text not null check (scope in ('perso','travail')),
  type text not null check (type in ('loisir','menage','travail')),
  importance text not null check (importance in ('petite','moyenne','grande','urgente')),
  status text not null check (status in ('a_faire','en_cours','fini')),
  location text not null check (location in ('partout','maison','travail')),
  duration text not null check (duration in ('courte','moyenne','longue')),
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Tasks are viewable by owner" on public.tasks for select using (auth.uid() = user_id);
create policy "Tasks are insertable by owner" on public.tasks for insert with check (auth.uid() = user_id);
create policy "Tasks are updatable by owner" on public.tasks for update using (auth.uid() = user_id);
create policy "Tasks are deletable by owner" on public.tasks for delete using (auth.uid() = user_id);
`;
