"use client";
import TopBar from "@/components/tasking/TopBar";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/fr";

type Status = "a_faire" | "en_cours" | "fini";
type Scope = "perso" | "travail";
type TaskType = "Loisir" | "Entretien du logement" | "Organisation vie perso" | "Sport" | "Travail";
type Importance = "petite" | "moyenne" | "grande" | "urgente";
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

const COLUMNS: { id: Status; title: string }[] = [
	{ id: "a_faire", title: "À faire" },
	{ id: "en_cours", title: "In Progress" },
	{ id: "fini", title: "Done" },
];

export default function TaskBoard() {
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
	const [dragEnabledId, setDragEnabledId] = useState<string | null>(null);
	const pressTimerRef = useRef<number | null>(null);
	const pressInfoRef = useRef<{ id: string; start: number; x: number; y: number; long: boolean } | null>(null);

	const [detailTask, setDetailTask] = useState<Task | null>(null);
	const [editing, setEditing] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [overlayError, setOverlayError] = useState<string | null>(null);

	const [editTitle, setEditTitle] = useState("");
	const [editDue, setEditDue] = useState("");
	const [editNotes, setEditNotes] = useState("");
	 const [editType, setEditType] = useState<TaskType>("Loisir");
	const [editImportance, setEditImportance] = useState<Importance>("moyenne");
	const [editStatus, setEditStatus] = useState<Status>("a_faire");
	const [editLocation, setEditLocation] = useState<Location>("partout");
	const [editDuration, setEditDuration] = useState<Duration>("courte");

	useEffect(() => {
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setDetailTask(null);
				setEditing(false);
			}
		};
		document.addEventListener("keydown", onEsc);
		return () => document.removeEventListener("keydown", onEsc);
	}, []);

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

	const onDropStatus = async (taskId: string, newStatus: Status) => {
		await fetch(`/api/tasks`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: taskId, status: newStatus }),
		});
		setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
	};

	const beginEdit = () => {
		if (!detailTask) return;
		setOverlayError(null);
		setEditTitle(detailTask.title);
		setEditDue(detailTask.due_date ? dayjs(detailTask.due_date).format("YYYY-MM-DD") : "");
		setEditNotes(detailTask.notes || "");
		setEditType(detailTask.type);
		setEditImportance(detailTask.importance);
		setEditStatus(detailTask.status);
		setEditLocation(detailTask.location);
		setEditDuration(detailTask.duration);
		setEditing(true);
	};

	const saveEdit = async () => {
		if (!detailTask) return;
		setActionLoading(true);
		setOverlayError(null);
		try {
			const res = await fetch("/api/tasks", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: detailTask.id,
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
			setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, title: editTitle.trim(), due_date: editDue || null, notes: editNotes || null, type: editType, importance: editImportance, status: editStatus, location: editLocation, duration: editDuration } : t));
			setDetailTask({ ...detailTask, title: editTitle.trim(), due_date: editDue || null, notes: editNotes || null, type: editType, importance: editImportance, status: editStatus, location: editLocation, duration: editDuration });
			setEditing(false);
		} catch (e: any) {
			setOverlayError(e.message || "Erreur");
		} finally {
			setActionLoading(false);
		}
	};

	const deleteTask = async () => {
		if (!detailTask) return;
		if (!confirm("Supprimer cette tâche ?")) return;
		setActionLoading(true);
		setOverlayError(null);
		try {
			const res = await fetch("/api/tasks", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: detailTask.id }),
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.error || "Échec de la suppression");
			setTasks(prev => prev.filter(t => t.id !== detailTask.id));
			setDetailTask(null);
			setEditing(false);
		} catch (e: any) {
			setOverlayError(e.message || "Erreur");
		} finally {
			setActionLoading(false);
		}
	};

	return (
		<>
			<div className="relative p-0 min-h-screen">
				<TopBar />
				{error && (
					<div className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200 px-3 py-2 text-sm">
						{error}
					</div>
				)}
				<div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 px-4">
					{COLUMNS.map((col) => (
						<section key={col.id}
							className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl min-h-[200px]"
							onDragOver={(e) => e.preventDefault()}
							onDrop={(e) => {
								const taskId = e.dataTransfer.getData("text/task-id");
								if (taskId) onDropStatus(taskId, col.id);
							}}
						>
							<header className="px-4 py-3 text-2xl font-semibold">{col.title}</header>
							<div className="space-y-3 px-4 pb-4">
								{loading && <div className="text-sm text-gray-500">Chargement…</div>}
								{tasks.filter(t => t.status === col.id).map((t) => (
									<article key={t.id}
										className={`border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white/80 dark:bg-neutral-900 ${dragEnabledId === t.id ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
										draggable={dragEnabledId === t.id}
										onDragStart={(e) => {
											e.dataTransfer.setData("text/task-id", t.id);
										}}
										onDragEnd={() => {
											setDragEnabledId(null);
											pressInfoRef.current = null;
											if (pressTimerRef.current) {
												clearTimeout(pressTimerRef.current);
												pressTimerRef.current = null;
											}
										}}
										onMouseDown={(e) => {
											pressInfoRef.current = { id: t.id, start: Date.now(), x: e.clientX, y: e.clientY, long: false };
											pressTimerRef.current = window.setTimeout(() => {
												if (pressInfoRef.current && pressInfoRef.current.id === t.id) {
													pressInfoRef.current.long = true;
													setDragEnabledId(t.id);
												}
											}, 300);
										}}
										onMouseMove={(e) => {
											const info = pressInfoRef.current;
											if (!info || info.long) return;
											const dx = Math.abs(e.clientX - info.x);
											const dy = Math.abs(e.clientY - info.y);
											if (dx > 5 || dy > 5) {
												if (pressTimerRef.current) {
													clearTimeout(pressTimerRef.current);
													pressTimerRef.current = null;
												}
												pressInfoRef.current = null;
											}
										}}
										onMouseUp={() => {
											const info = pressInfoRef.current;
											if (pressTimerRef.current) {
												clearTimeout(pressTimerRef.current);
												pressTimerRef.current = null;
											}
											if (info && !info.long) {
												setDetailTask(t);
											}
											pressInfoRef.current = null;
											if (dragEnabledId === t.id) setTimeout(() => setDragEnabledId(null), 100);
										}}
										onTouchStart={(e) => {
											const touch = e.touches[0];
											pressInfoRef.current = { id: t.id, start: Date.now(), x: touch.clientX, y: touch.clientY, long: false };
											pressTimerRef.current = window.setTimeout(() => {
												if (pressInfoRef.current && pressInfoRef.current.id === t.id) {
													pressInfoRef.current.long = true;
													setDragEnabledId(t.id);
												}
											}, 350);
										}}
										onTouchMove={(e) => {
											const info = pressInfoRef.current;
											if (!info || info.long) return;
											const touch = e.touches[0];
											const dx = Math.abs(touch.clientX - info.x);
											const dy = Math.abs(touch.clientY - info.y);
											if (dx > 8 || dy > 8) {
												if (pressTimerRef.current) {
													clearTimeout(pressTimerRef.current);
													pressTimerRef.current = null;
												}
												pressInfoRef.current = null;
											}
										}}
										onTouchEnd={() => {
											const info = pressInfoRef.current;
											if (pressTimerRef.current) {
												clearTimeout(pressTimerRef.current);
												pressTimerRef.current = null;
											}
											if (info && !info.long) {
												setDetailTask(t);
											}
											pressInfoRef.current = null;
											if (dragEnabledId === t.id) setTimeout(() => setDragEnabledId(null), 150);
										}}
									>
										<div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-neutral-800 border-b dark:border-neutral-800">
											<div className="font-medium truncate text-gray-900 dark:text-gray-100" title={t.title}>{t.title}</div>
											{t.due_date && (
												<span className="ml-4 inline-flex items-center text-xs rounded-md px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60">
													{dayjs(t.due_date).locale("fr").format("DD/MM/YYYY")}
												</span>
											)}
										</div>
										<div className="grid grid-cols-2 gap-4 px-4 py-3">
											<div className="space-y-2 text-xs">
												<div><span className="text-gray-700 dark:text-gray-300">Type</span><div className="h-5 mt-1 rounded bg-indigo-200/60 dark:bg-indigo-900/40 px-2 flex items-center text-black dark:text-white">{t.type}</div></div>
												<div><span className="text-gray-700 dark:text-gray-300">Importance</span><div className="h-5 mt-1 rounded bg-cyan-200/60 dark:bg-cyan-900/40 px-2 flex items-center text-black dark:text-white">{t.importance}</div></div>
												<div><span className="text-gray-700 dark:text-gray-300">Lieu</span><div className="h-5 mt-1 rounded bg-orange-200/60 dark:bg-orange-900/40 px-2 flex items-center text-black dark:text-white">{t.location}</div></div>
												<div><span className="text-gray-700 dark:text-gray-300">Durée</span><div className="h-5 mt-1 rounded bg-violet-200/60 dark:bg-violet-900/40 px-2 flex items-center text-black dark:text-white">{t.duration}</div></div>
											</div>
											<div>
												<div className="text-gray-700 dark:text-gray-300 text-xs mb-1">Notes</div>
												<div className={`min-h-16 max-h-40 overflow-auto overscroll-contain rounded-md bg-gray-100 dark:bg-neutral-800 text-xs p-2 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200`}>{t.notes || ""}</div>
											</div>
										</div>
									</article>
								))}
							</div>
						</section>
					))}
				</div>

				{detailTask && (
					<div className="fixed inset-x-0 top-16 bottom-0 z-50">
						<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
						<div className="relative z-10 h-full flex justify-center items-stretch py-3 md:py-4" onClick={() => { setDetailTask(null); setEditing(false); }}>
							<div className="h-full w-full max-w-3xl bg-white/95 dark:bg-neutral-900/95 rounded-none md:rounded-xl shadow-lg border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col" onClick={(e)=>e.stopPropagation()}>
								<div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 gap-3 flex-none">
									<div className="flex items-center gap-3 min-w-0">
										<div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate" title={detailTask.title}>{detailTask.title}</div>
										{detailTask.due_date && (
											<span className="inline-flex items-center text-xs rounded-md px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60">
												{dayjs(detailTask.due_date).locale('fr').format('DD/MM/YYYY')}
											</span>
										)}
									</div>
								</div>

								<div className="px-6 pt-5 pb-0 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto">
									<div className="space-y-4 text-sm">
										<div>
											<div className="text-gray-700 dark:text-gray-300 text-sm mb-2">Titre</div>
											{editing ? (
												<input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} className="h-10 w-full rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" placeholder="Titre" />
											) : (
												<div className="rounded-md bg-gray-100 dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-gray-100">{detailTask.title}</div>
											)}
										</div>
										<div>
											<div className="text-gray-700 dark:text-gray-300 text-sm mb-2">Délai</div>
											{editing ? (
												<input type="date" value={editDue} onChange={(e)=>setEditDue(e.target.value)} className="h-10 w-full rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" />
											) : (
												<div className="rounded-md bg-gray-100 dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-gray-100">{detailTask.due_date ? dayjs(detailTask.due_date).locale('fr').format('DD/MM/YYYY') : "—"}</div>
											)}
										</div>

										<div>
											<div className="text-gray-600 dark:text-gray-400 text-xs mb-2">Type</div>
											{editing ? (
												<div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
													{["Loisir","Entretien du logement","Organisation vie perso","Sport","Travail"].map((opt) => (
														<button key={opt} type="button" onClick={()=>setEditType(opt as TaskType)} aria-pressed={editType===opt}
															className={`flex-1 px-3 py-2 text-sm text-center transition-colors ${editType===opt?"bg-indigo-500 dark:bg-indigo-600 text-white":"bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
														>
															{opt}
														</button>
													))}
												</div>
											) : (
												<div className="rounded bg-indigo-200/60 dark:bg-indigo-900/40 px-2 py-1 inline-block text-gray-900 dark:text-white">{detailTask.type}</div>
											)}
										</div>

										<div>
											<div className="text-gray-600 dark:text-gray-400 text-xs mb-2">Importance</div>
											{editing ? (
												<div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
													{["petite","moyenne","grande","urgente"].map((opt) => (
														<button key={opt} type="button" onClick={()=>setEditImportance(opt as Importance)} aria-pressed={editImportance===opt}
															className={`flex-1 px-3 py-2 text-sm text-center transition-colors ${editImportance===opt?"bg-cyan-500 dark:bg-cyan-600 text-white":"bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
														>
															{opt.replace(/^./, s=>s.toUpperCase())}
														</button>
													))}
												</div>
											) : (
												<div className="rounded bg-cyan-200/60 dark:bg-cyan-900/40 px-2 py-1 inline-block text-gray-900 dark:text-white">{detailTask.importance}</div>
											)}
										</div>

										<div>
											<div className="text-gray-600 dark:text-gray-400 text-xs mb-2">État</div>
											{editing ? (
												<div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
													{["a_faire","en_cours","fini"].map((opt) => (
														<button key={opt} type="button" onClick={()=>setEditStatus(opt as Status)} aria-pressed={editStatus===opt}
															className={`flex-1 px-3 py-2 text-sm text-center transition-colors ${editStatus===opt?"bg-green-500 dark:bg-green-600 text-white":"bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
														>
															{opt === "a_faire" ? "À faire" : opt.replace(/_/g, " ").replace(/^./, s=>s.toUpperCase())}
														</button>
													))}
												</div>
											) : (
												<div className="rounded bg-green-200/60 dark:bg-green-900/40 px-2 py-1 inline-block text-gray-900 dark:text-white">{detailTask.status}</div>
											)}
										</div>

										<div>
											<div className="text-gray-600 dark:text-gray-400 text-xs mb-2">Lieu</div>
											{editing ? (
												<div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
													{["partout","maison","travail"].map((opt) => (
														<button key={opt} type="button" onClick={()=>setEditLocation(opt as Location)} aria-pressed={editLocation===opt}
															className={`flex-1 px-3 py-2 text-sm text-center transition-colors ${editLocation===opt?"bg-orange-500 dark:bg-orange-600 text-white":"bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
														>
															{opt.replace(/^./, s=>s.toUpperCase())}
														</button>
													))}
												</div>
											) : (
												<div className="rounded bg-orange-200/60 dark:bg-orange-900/40 px-2 py-1 inline-block text-gray-900 dark:text-white">{detailTask.location}</div>
											)}
										</div>

										<div>
											<div className="text-gray-600 dark:text-gray-400 text-xs mb-2">Durée</div>
											{editing ? (
												<div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-700">
													{["courte","moyenne","longue"].map((opt) => (
														<button key={opt} type="button" onClick={()=>setEditDuration(opt as Duration)} aria-pressed={editDuration===opt}
															className={`flex-1 px-3 py-2 text-sm text-center transition-colors ${editDuration===opt?"bg-violet-500 dark:bg-violet-600 text-white":"bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
														>
															{opt.replace(/^./, s=>s.toUpperCase())}
														</button>
													))}
												</div>
											) : (
												<div className="rounded bg-violet-200/60 dark:bg-violet-900/40 px-2 py-1 inline-block text-gray-900 dark:text-white">{detailTask.duration}</div>
											)}
										</div>

										<div className="text-xs text-gray-600 dark:text-gray-400">Créée le {dayjs(detailTask.created_at).locale('fr').format('DD/MM/YYYY HH:mm')}</div>
									</div>

									<div>
										<div className="text-gray-700 dark:text-gray-300 text-sm mb-2">Notes</div>
										{editing ? (
											<textarea value={editNotes} onChange={(e)=>setEditNotes(e.target.value)} rows={12} className="w-full rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" />
										) : (
											<div className="min-h-40 rounded-md bg-gray-100 dark:bg-neutral-800 text-sm p-3 whitespace-pre-wrap text-gray-800 dark:text-gray-200">{detailTask.notes || ''}</div>
										)}
									</div>
								</div>

								<div className="bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 px-6 py-2 pb-[env(safe-area-inset-bottom)] flex items-center justify-between gap-3 flex-none">
									<div className="flex items-center gap-3 pb-2">
										{overlayError && <div className="text-sm text-amber-700 dark:text-amber-300">{overlayError}</div>}
										<button onClick={deleteTask} disabled={actionLoading} className="h-10 px-4 inline-flex items-center justify-center leading-none rounded-md border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60">Supprimer</button>
									</div>
									<div className="flex items-center gap-2 pb-2">
										{editing ? (
											<>
												<button onClick={saveEdit} disabled={actionLoading || !editTitle.trim()} className="h-10 px-4 inline-flex items-center justify-center leading-none rounded-md bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white text-sm disabled:opacity-60">Enregistrer</button>
												<button onClick={()=>{setEditing(false); setOverlayError(null);}} disabled={actionLoading} className="h-10 px-4 inline-flex items-center justify-center leading-none rounded-md border border-neutral-200 dark:border-neutral-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60">Annuler</button>
											</>
										) : (
											<button onClick={beginEdit} className="h-10 px-4 inline-flex items-center justify-center leading-none rounded-md border border-neutral-200 dark:border-neutral-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">Modifier</button>
										)}
										<button onClick={() => { setDetailTask(null); setEditing(false); }} className="h-10 px-4 inline-flex items-center justify-center leading-none rounded-md border border-neutral-200 dark:border-neutral-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">Fermer</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
}


