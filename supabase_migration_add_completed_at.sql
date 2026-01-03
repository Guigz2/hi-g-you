-- Migration: track completion time for tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

-- Index to help filter old finished tasks
CREATE INDEX IF NOT EXISTS tasks_completed_at_idx ON public.tasks(completed_at);
