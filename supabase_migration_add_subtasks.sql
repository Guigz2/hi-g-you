-- Migration: add parent-child subtasks and sibling ordering
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS tasks_parent_idx ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS tasks_user_parent_order_idx ON public.tasks(user_id, parent_id, order_index);
