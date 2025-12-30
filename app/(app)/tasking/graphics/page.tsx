"use client";
import TopBarSimple from "@/components/tasking/TopBarSimple";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/fr";

type Status = "a_faire" | "en_cours" | "fini";
type Scope = "perso" | "travail";
type TaskType = "Loisir" | "Entretien du logement" | "Organisation vie perso" | "Sport" | "Travail";
type Importance = "petite" | "moyenne" | "grande" | "urgente";

type Task = {
  id: string;
  user_id: string;
  title: string;
  scope: Scope;
  type: TaskType;
  importance: Importance;
  status: Status;
  location: string;
  duration: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function TaskGraphicsPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <TaskGraphicsInner />
    </Suspense>
  );
}

function TaskGraphicsInner() {
  const params = useSearchParams();
  const filters = useMemo(() => ({
    scope: (params.get("scope") || "perso") as any,
    type: (params.get("type") || "tous") as any,
    importance: (params.get("importance") || "tous") as any,
    status: (params.get("status") || "tous") as any,
    location: (params.get("location") || "tous") as any,
    duration: (params.get("duration") || "tous") as any,
  }), [params]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
        const res = await fetch(`/api/tasks?${qs.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          let detail = "";
          try { const j = await res.json(); detail = j?.error || ""; } catch {}
          if (mounted) {
            setError(detail || "Impossible de charger les tâches");
            setTasks([]);
          }
          return;
        }
        const data: Task[] = await res.json();
        if (mounted) setTasks(data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  const counts = useMemo(() => {
    const byStatus: Record<Status, number> = { a_faire: 0, en_cours: 0, fini: 0 };
    const byImportance: Record<Importance, number> = { petite: 0, moyenne: 0, grande: 0, urgente: 0 };
    const byType: Record<TaskType, number> = {
      "Loisir": 0,
      "Entretien du logement": 0,
      "Organisation vie perso": 0,
      "Sport": 0,
      "Travail": 0,
    };
    tasks.forEach(t => {
      byStatus[t.status]++;
      byImportance[t.importance]++;
      byType[t.type]++;
    });
    return { byStatus, byImportance, byType };
  }, [tasks]);

  const lastDays = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => dayjs().startOf("day").subtract(13 - i, "day"));
    const perDay = days.map(d => ({
      label: d.locale("fr").format("DD/MM"),
      count: tasks.filter(t => dayjs(t.created_at).isSame(d, "day")).length,
    }));
    const max = Math.max(1, ...perDay.map(p => p.count));
    return { days: perDay, max };
  }, [tasks]);

  const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded-md overflow-hidden">
      <div className={`${color} h-full`} style={{ width: `${Math.round((value / Math.max(1, max)) * 100)}%` }} />
    </div>
  );

  return (
    <div className="min-h-screen">
      <TopBarSimple title="Graphiques" />
      <div className="px-6 py-4">
        {error && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl p-4">
            <div className="text-lg font-semibold mb-3">Par statut</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>À faire</span><span>{counts.byStatus.a_faire}</span></div>
                <Bar value={counts.byStatus.a_faire} max={tasks.length} color="bg-green-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>En cours</span><span>{counts.byStatus.en_cours}</span></div>
                <Bar value={counts.byStatus.en_cours} max={tasks.length} color="bg-indigo-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Fini</span><span>{counts.byStatus.fini}</span></div>
                <Bar value={counts.byStatus.fini} max={tasks.length} color="bg-violet-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl p-4">
            <div className="text-lg font-semibold mb-3">Par importance</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Petite</span><span>{counts.byImportance.petite}</span></div>
                <Bar value={counts.byImportance.petite} max={tasks.length} color="bg-cyan-300" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Moyenne</span><span>{counts.byImportance.moyenne}</span></div>
                <Bar value={counts.byImportance.moyenne} max={tasks.length} color="bg-cyan-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Grande</span><span>{counts.byImportance.grande}</span></div>
                <Bar value={counts.byImportance.grande} max={tasks.length} color="bg-cyan-500" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Urgente</span><span>{counts.byImportance.urgente}</span></div>
                <Bar value={counts.byImportance.urgente} max={tasks.length} color="bg-red-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl p-4">
            <div className="text-lg font-semibold mb-3">Par type</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Loisir</span><span>{counts.byType["Loisir"]}</span></div>
                <Bar value={counts.byType["Loisir"]} max={tasks.length} color="bg-indigo-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Entretien du logement</span><span>{counts.byType["Entretien du logement"]}</span></div>
                <Bar value={counts.byType["Entretien du logement"]} max={tasks.length} color="bg-orange-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Organisation vie perso</span><span>{counts.byType["Organisation vie perso"]}</span></div>
                <Bar value={counts.byType["Organisation vie perso"]} max={tasks.length} color="bg-cyan-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Sport</span><span>{counts.byType["Sport"]}</span></div>
                <Bar value={counts.byType["Sport"]} max={tasks.length} color="bg-green-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1"><span>Travail</span><span>{counts.byType["Travail"]}</span></div>
                <Bar value={counts.byType["Travail"]} max={tasks.length} color="bg-violet-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl p-4 mt-4">
          <div className="text-lg font-semibold mb-3">Créations sur 14 jours</div>
          <div className="w-full overflow-x-hidden">
            <svg viewBox={`0 0 ${lastDays.days.length * 28} 120`} width="100%" height={120} className="block">
              {lastDays.days.map((d, i) => {
                const x = i * 28 + 14;
                const h = Math.round((d.count / Math.max(1, lastDays.max)) * 90);
                const y = 100 - h;
                return (
                  <g key={d.label}>
                    <rect x={x - 8} y={y} width={16} height={h} rx={4} className="fill-indigo-500" />
                    <text x={x} y={112} textAnchor="middle" className="fill-gray-600 dark:fill-gray-400 text-[10px]">{d.label}</text>
                    <text x={x} y={y - 4} textAnchor="middle" className="fill-gray-800 dark:fill-gray-200 text-[10px]">{d.count}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
