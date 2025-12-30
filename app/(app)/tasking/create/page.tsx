"use client";
import TopBarSimple from "@/components/tasking/TopBarSimple";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

type Scope = "perso" | "travail";
type TaskType = "Loisir" | "Entretien du logement" | "Organisation vie perso" | "Sport" | "Travail";
type Importance = "petite" | "moyenne" | "grande" | "urgente";
type Status = "a_faire" | "en_cours" | "fini";
type Location = "partout" | "maison" | "travail";
type Duration = "courte" | "moyenne" | "longue";

export default function CreateTicket() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <CreateTicketInner />
    </Suspense>
  );
}

function CreateTicketInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = useMemo(() => ({
    scope: (params.get("scope") || "perso") as Scope,
    type: (params.get("type") || "tous").replace(/^tous$/, "Loisir") as TaskType,
    importance: (params.get("importance") || "moyenne") as Importance,
    // Toujours créer en "À faire" par défaut
    status: "a_faire" as Status,
    location: (params.get("location") || "partout") as Location,
    duration: (params.get("duration") || "courte") as Duration,
  }), [params]);

  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<Scope>(defaults.scope);
  const [type, setType] = useState<TaskType>(defaults.type);
  const [importance, setImportance] = useState<Importance>(defaults.importance);
  const [status, setStatus] = useState<Status>(defaults.status);
  const [location, setLocation] = useState<Location>(defaults.location);
  const [duration, setDuration] = useState<Duration>(defaults.duration);
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scope, type, importance, status, location, duration,
          due_date: due || null,
          notes: notes || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Erreur lors de la création");
      const sp = new URLSearchParams(params.toString());
      router.push(`/tasking?${sp.toString()}`);
    } catch (e: any) {
      setError(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBarSimple title="Création de ticket" />
      <div className="p-6">
      {error && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200 px-3 py-2 text-sm">{error}</div>
      )}
      <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 p-6">
          <div className="md:col-span-4">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Titre tâche</div>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="h-10 w-full rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" placeholder="Ex: Faire les courses" />
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Périmètre</div>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
              {( ["perso","travail"] as Scope[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={scope === opt}
                  onClick={() => setScope(opt)}
                  className={`flex-1 px-3 py-2 text-sm text-center transition-colors
                    ${scope === opt ? "bg-rose-500 dark:bg-rose-600 text-white" : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
                >
                  {opt === "perso" ? "Perso" : "Travail"}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Type</div>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
              {( ["Loisir","Entretien du logement","Organisation vie perso","Sport","Travail"] as TaskType[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={type === opt}
                  onClick={() => setType(opt)}
                  className={`flex-1 px-3 py-2 text-sm text-center transition-colors
                    ${type === opt ? "bg-indigo-500 dark:bg-indigo-600 text-white" : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Importance</div>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
              {( ["petite","moyenne","grande","urgente"] as Importance[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={importance === opt}
                  onClick={() => setImportance(opt)}
                  className={`flex-1 px-3 py-2 text-sm text-center transition-colors
                    ${importance === opt ? "bg-cyan-500 dark:bg-cyan-600 text-white" : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
                >
                  {opt.replace(/^./, s=>s.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-700 dark:text-gray-300 mb-2">État</div>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
              {( ["a_faire","en_cours","fini"] as Status[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={status === opt}
                  onClick={() => setStatus(opt)}
                  className={`flex-1 px-3 py-2 text-sm text-center transition-colors
                    ${status === opt ? "bg-green-500 dark:bg-green-600 text-white" : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
                >
                  {opt === "a_faire" ? "À faire" : opt.replace(/_/g, " ").replace(/^./, s=>s.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Lieu</div>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
              {( ["partout","maison","travail"] as Location[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={location === opt}
                  onClick={() => setLocation(opt)}
                  className={`flex-1 px-3 py-2 text-sm text-center transition-colors
                    ${location === opt ? "bg-orange-500 dark:bg-orange-600 text-white" : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
                >
                  {opt.replace(/^./, s=>s.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Durée estimée</div>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
              {( ["courte","moyenne","longue"] as Duration[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={duration === opt}
                  onClick={() => setDuration(opt)}
                  className={`flex-1 px-3 py-2 text-sm text-center transition-colors
                    ${duration === opt ? "bg-violet-500 dark:bg-violet-600 text-white" : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
                >
                  {opt.replace(/^./, s=>s.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Délai</div>
            <input type="date" value={due} onChange={(e)=>setDue(e.target.value)} className="h-10 w-full rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" />
          </div>
          <div className="md:col-span-4">
            <div className="text-gray-700 dark:text-gray-300 mb-2">Notes</div>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={6} className="w-full rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" />
          </div>
        </div>
        <div className="flex items-center gap-6 p-6 border-t dark:border-neutral-800">
          <div className="space-y-3 text-gray-900 dark:text-gray-100">
            {[{label:"Ponctuel", val:"ponctuel"},{label:"Hebdomadaire", val:"hebdo"},{label:"Journalier", val:"jour"}].map((o) => (
              <label key={o.label} className="flex items-center gap-3 text-lg">
                <span className={`inline-block w-8 h-8 rounded-md bg-gray-300 dark:bg-neutral-700`} />
                {o.label}
              </label>
            ))}
          </div>
          <button onClick={onSubmit} disabled={submitting || !title.trim()} className="ml-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white rounded-xl text-lg disabled:opacity-60">
            {submitting ? "Ajout..." : "Ajouter le ticket"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
