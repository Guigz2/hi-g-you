"use client";
import TopBar from "@/components/tasking/TopBar";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/fr";

type Status = "a_faire" | "en_cours" | "fini";
type Scope = "perso" | "travail";
type TaskType = "Loisir" | "Entretien du logement" | "Organisation vie perso" | "Sport" | "Travail";
type Importance = "petite" | "moyenne" | "grande" | "urgente"   ;
type Location = "partout" | "maison" | "travail";
type Duration = "courte" | "moyenne" | "longue";

type Task = {
  id: string;
  user_id: string;
  title: string;
  scope: Scope;
  type: TaskType;
  importance: Importance;
  status: Status;
  location: Location;
  duration: Duration;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

const HEADERS = [
  { key: "title", label: "Titre tâche" },
  { key: "type", label: "Type" },
  { key: "due_date", label: "Délai" },
  { key: "importance", label: "Importance" },
  { key: "location", label: "Lieu" },
  { key: "duration", label: "Durée estimée" },
  { key: "notes", label: "Notes" },
] as const;

type SortKey = typeof HEADERS[number]["key"];

export default function TaskList() {
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
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editType, setEditType] = useState<TaskType>("Loisir");
  const [editImportance, setEditImportance] = useState<Importance>("moyenne");
  const [editStatus, setEditStatus] = useState<Status>("a_faire");
  const [editLocation, setEditLocation] = useState<Location>("partout");
  const [editDuration, setEditDuration] = useState<Duration>("courte");
  const [useOptimalSort, setUseOptimalSort] = useState(false);

  const TYPE_ORDER: Record<TaskType, number> = {
    "Travail": 0,
    "Entretien du logement": 1,
    "Organisation vie perso": 2,
    "Sport": 3,
    "Loisir": 4,
  };
  const IMPORTANCE_ORDER: Record<Importance, number> = {
    urgente: 0,
    grande: 1,
    moyenne: 2,
    petite: 3,
  };
  const DURATION_ORDER: Record<Duration, number> = {
    courte: 0,
    moyenne: 1,
    longue: 2,
  };

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

  const sorted = useMemo(() => {
    const arr = [...tasks];
    if (useOptimalSort) {
      arr.sort((a, b) => {
        const dueA = a.due_date ? dayjs(a.due_date).valueOf() : Number.MAX_SAFE_INTEGER;
        const dueB = b.due_date ? dayjs(b.due_date).valueOf() : Number.MAX_SAFE_INTEGER;
        if (dueA !== dueB) return dueA - dueB;
        const impA = IMPORTANCE_ORDER[a.importance];
        const impB = IMPORTANCE_ORDER[b.importance];
        if (impA !== impB) return impA - impB;
        const typeA = TYPE_ORDER[a.type];
        const typeB = TYPE_ORDER[b.type];
        if (typeA !== typeB) return typeA - typeB;
        const durA = DURATION_ORDER[a.duration];
        const durB = DURATION_ORDER[b.duration];
        if (durA !== durB) return durA - durB;
        return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf();
      });
      return arr;
    }
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const getVal = (t: Task) => {
        switch (sortKey) {
          case "title": return t.title.toLowerCase();
          case "type": return t.type;
          case "importance": return t.importance;
          case "location": return t.location;
          case "duration": return t.duration;
          case "due_date": return t.due_date ? dayjs(t.due_date).valueOf() : Number.MAX_SAFE_INTEGER;
          case "notes": return (t.notes || "").toLowerCase();
          default: return 0;
        }
      };
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf();
    });
    return arr;
  }, [tasks, sortKey, sortDir, useOptimalSort]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Use flexible fractional columns with minmax(0, fr) to avoid horizontal overflow
  const gridCols = "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,2fr)";
  const gridColsWithActions = `${gridCols} minmax(0,1fr)`;

  const beginEdit = (t: Task) => {
    setRowError(null);
    setEditRowId(t.id);
    setEditTitle(t.title);
    setEditDue(t.due_date ? dayjs(t.due_date).format("YYYY-MM-DD") : "");
    setEditNotes(t.notes || "");
    setEditType(t.type);
    setEditImportance(t.importance);
    setEditStatus(t.status);
    setEditLocation(t.location);
    setEditDuration(t.duration);
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setRowError(null);
  };

  const saveEdit = async () => {
    if (!editRowId) return;
    setActionLoadingId(editRowId);
    setRowError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editRowId,
          title: editTitle.trim(),
          due_date: editDue || null,
          notes: editNotes || null,
          type: editType,
          importance: editImportance,
          status: editStatus,
          location: editLocation,
          duration: editDuration,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Échec de la mise à jour");
      setTasks(prev => prev.map(t => t.id === editRowId ? { ...t, title: editTitle.trim(), due_date: editDue || null, notes: editNotes || null, type: editType, importance: editImportance, status: editStatus, location: editLocation, duration: editDuration } : t));
      setEditRowId(null);
    } catch (e: any) {
      setRowError(e.message || "Erreur");
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    setActionLoadingId(id);
    setRowError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Échec de la suppression");
      setTasks(prev => prev.filter(t => t.id !== id));
      if (editRowId === id) setEditRowId(null);
    } catch (e: any) {
      setRowError(e.message || "Erreur");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-0 min-h-screen">
      <TopBar />
      <div className="px-6">
        <div className="flex items-center justify-between mt-4 mb-3">
          <div className="text-2xl font-semibold">Liste des tâches</div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">{sorted.length} tâche(s)</div>
            <button
              onClick={() => setUseOptimalSort(v => !v)}
              className={`px-3 py-1.5 rounded-md border text-sm ${useOptimalSort ? "bg-indigo-600 text-white border-indigo-600" : "border-neutral-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200"}`}
              title={useOptimalSort ? "Désactiver le tri optimal" : "Activer le tri optimal"}
            >
              {useOptimalSort ? "Tri optimal activé" : "Tri optimal"}
            </button>
          </div>
        </div>
        {error && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200 px-3 py-2 text-sm mb-3">
            {error}
          </div>
        )}
        <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="hidden md:grid" style={{ gridTemplateColumns: gridColsWithActions }}>
                {HEADERS.map((h, i) => (
                  <button
                    key={h.key}
                    onClick={() => toggleSort(h.key)}
                    className={`${i < HEADERS.length - 1 ? "border-r dark:border-neutral-800" : ""} px-4 py-3 font-semibold text-sm sm:text-base text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors`}
                    title={`Trier par ${h.label}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {h.label}
                      {sortKey === h.key && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </span>
                  </button>
                ))}
                <div className="px-4 py-3 font-semibold text-sm sm:text-base">Actions</div>
              </div>
              {loading && (
                <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Chargement…</div>
              )}

              {/* Desktop rows */}
              {!loading && sorted.map((t, r) => (
                <div key={t.id} className={`hidden md:grid border-t dark:border-neutral-800 items-center ${r % 2 === 0 ? "bg-gray-50 dark:bg-neutral-800/50" : ""}`} style={{ gridTemplateColumns: gridColsWithActions }}>
                  <div className="px-4 border-r border-neutral-200 dark:border-neutral-800 self-stretch" title={t.title}>
                    <div className="py-2 text-sm text-gray-900 dark:text-gray-100 truncate flex items-center">
                      {editRowId === t.id ? (
                        <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} className="h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm" />
                      ) : t.title}
                    </div>
                  </div>
                  <div className="px-4 border-r border-neutral-200 dark:border-neutral-800 self-stretch">
                    <div className="py-2 text-sm text-gray-700 dark:text-gray-300 truncate flex items-center">
                      {editRowId === t.id ? (
                        <select value={editType} onChange={(e)=>setEditType(e.target.value as TaskType)} className="h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                          <option value="Loisir">Loisir</option>
                          <option value="Entretien du logement">Entretien du logement</option>
                          <option value="Organisation vie perso">Organisation vie perso</option>
                          <option value="Sport">Sport</option>
                          <option value="Travail">Travail</option>
                        </select>
                      ) : t.type}
                    </div>
                  </div>
                  <div className="px-4 border-r border-neutral-200 dark:border-neutral-800 self-stretch">
                    <div className="py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                      {editRowId === t.id ? (
                        <input type="date" value={editDue} onChange={(e)=>setEditDue(e.target.value)} className="h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm" />
                      ) : (t.due_date ? dayjs(t.due_date).locale("fr").format("DD/MM/YYYY") : "—")}
                    </div>
                  </div>
                  <div className="px-4 border-r border-neutral-200 dark:border-neutral-800 self-stretch">
                    <div className="py-2 text-sm text-gray-700 dark:text-gray-300 truncate flex items-center">
                      {editRowId === t.id ? (
                        <select value={editImportance} onChange={(e)=>setEditImportance(e.target.value as Importance)} className="h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                          <option value="petite">Petite</option>
                          <option value="moyenne">Moyenne</option>
                          <option value="grande">Grande</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      ) : t.importance.replace(/^./, s=>s.toUpperCase())}
                    </div>
                  </div>
                  <div className="px-4 border-r border-neutral-200 dark:border-neutral-800 self-stretch">
                    <div className="py-2 text-sm text-gray-700 dark:text-gray-300 truncate flex items-center">
                      {editRowId === t.id ? (
                        <select value={editLocation} onChange={(e)=>setEditLocation(e.target.value as Location)} className="h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                          <option value="partout">Partout</option>
                          <option value="maison">Maison</option>
                          <option value="travail">Travail</option>
                        </select>
                      ) : t.location.replace(/^./, s=>s.toUpperCase())}
                    </div>
                  </div>
                  <div className="px-4 border-r border-neutral-200 dark:border-neutral-800 self-stretch">
                    <div className="py-2 text-sm text-gray-700 dark:text-gray-300 truncate flex items-center">
                      {editRowId === t.id ? (
                        <select value={editDuration} onChange={(e)=>setEditDuration(e.target.value as Duration)} className="h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                          <option value="courte">Courte</option>
                          <option value="moyenne">Moyenne</option>
                          <option value="longue">Longue</option>
                        </select>
                      ) : t.duration.replace(/^./, s=>s.toUpperCase())}
                    </div>
                  </div>
                  <div className="px-4 border-r border-neutral-200 dark:border-neutral-800 self-stretch" title={t.notes || ""}>
                    <div className="py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {editRowId === t.id ? (
                        <textarea value={editNotes} onChange={(e)=>setEditNotes(e.target.value)} rows={2} className="w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-gray-900 dark:text-gray-100 text-sm" />
                      ) : (t.notes || "")}
                    </div>
                  </div>
                  <div className="px-4 py-2 text-sm">
                    {rowError && editRowId === t.id && (
                      <div className="mb-2 text-amber-700 dark:text-amber-300">{rowError}</div>
                    )}
                    {editRowId === t.id ? (
                      <div className="w-full flex flex-wrap items-center gap-2">
                        <button onClick={saveEdit} disabled={actionLoadingId === t.id || !editTitle.trim()} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white text-sm disabled:opacity-60">Enregistrer</button>
                        <button onClick={cancelEdit} disabled={actionLoadingId === t.id} className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">Annuler</button>
                      </div>
                    ) : (
                      <div className="w-full flex flex-wrap items-center gap-2">
                        <button onClick={() => beginEdit(t)} className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">Modifier</button>
                        <button onClick={() => deleteTask(t.id)} disabled={actionLoadingId === t.id} className="px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30">Supprimer</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Mobile cards */}
              {!loading && (
                <div className="md:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
                  {sorted.map((t) => (
                    <div key={t.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {editRowId === t.id ? (
                            <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} className="h-9 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm" />
                          ) : (
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate" title={t.title}>{t.title}</div>
                          )}
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {editRowId === t.id ? (
                              <input type="date" value={editDue} onChange={(e)=>setEditDue(e.target.value)} className="h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm" />
                            ) : (
                              t.due_date ? dayjs(t.due_date).locale("fr").format("DD/MM/YYYY") : "—"
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {rowError && editRowId === t.id && (
                            <div className="mb-2 text-amber-700 dark:text-amber-300 text-xs">{rowError}</div>
                          )}
                          {editRowId === t.id ? (
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              <button onClick={saveEdit} disabled={actionLoadingId === t.id || !editTitle.trim()} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white text-sm disabled:opacity-60">Enregistrer</button>
                              <button onClick={cancelEdit} disabled={actionLoadingId === t.id} className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">Annuler</button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              <button onClick={() => beginEdit(t)} className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">Modifier</button>
                              <button onClick={() => deleteTask(t.id)} disabled={actionLoadingId === t.id} className="px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30">Supprimer</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Type</div>
                          {editRowId === t.id ? (
                            <select value={editType} onChange={(e)=>setEditType(e.target.value as TaskType)} className="mt-1 h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                                  <option value="Loisir">Loisir</option>
                                  <option value="Entretien du logement">Entretien du logement</option>
                                  <option value="Organisation vie perso">Organisation vie perso</option>
                                  <option value="Sport">Sport</option>
                                  <option value="Travail">Travail</option>
                            </select>
                          ) : (
                            <div className="mt-1 inline-block rounded bg-indigo-200/60 dark:bg-indigo-900/40 px-2 py-1 text-xs text-black dark:text-white">
                              {t.type}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Importance</div>
                          {editRowId === t.id ? (
                            <select value={editImportance} onChange={(e)=>setEditImportance(e.target.value as Importance)} className="mt-1 h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                              <option value="petite">Petite</option>
                              <option value="moyenne">Moyenne</option>
                              <option value="grande">Grande</option>
                              <option value="urgente">Urgente</option>
                            </select>
                          ) : (
                            <div className="mt-1 inline-block rounded bg-cyan-200/60 dark:bg-cyan-900/40 px-2 py-1 text-xs text-black dark:text-white">
                              {t.importance.replace(/^./, s=>s.toUpperCase())}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Lieu</div>
                          {editRowId === t.id ? (
                            <select value={editLocation} onChange={(e)=>setEditLocation(e.target.value as Location)} className="mt-1 h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                              <option value="partout">Partout</option>
                              <option value="maison">Maison</option>
                              <option value="travail">Travail</option>
                            </select>
                          ) : (
                            <div className="mt-1 inline-block rounded bg-orange-200/60 dark:bg-orange-900/40 px-2 py-1 text-xs text-black dark:text-white">
                              {t.location.replace(/^./, s=>s.toUpperCase())}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Durée</div>
                          {editRowId === t.id ? (
                            <select value={editDuration} onChange={(e)=>setEditDuration(e.target.value as Duration)} className="mt-1 h-8 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-gray-900 dark:text-gray-100 text-sm">
                              <option value="courte">Courte</option>
                              <option value="moyenne">Moyenne</option>
                              <option value="longue">Longue</option>
                            </select>
                          ) : (
                            <div className="mt-1 inline-block rounded bg-violet-200/60 dark:bg-violet-900/40 px-2 py-1 text-xs text-black dark:text-white">
                              {t.duration.replace(/^./, s=>s.toUpperCase())}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</div>
                        {editRowId === t.id ? (
                          <textarea value={editNotes} onChange={(e)=>setEditNotes(e.target.value)} rows={3} className="w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-gray-900 dark:text-gray-100 text-sm" />
                        ) : (
                          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-24 overflow-auto">{t.notes || ""}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
