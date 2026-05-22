"use client";
import { useState } from "react";
import { Trash2, Plus, Search, RefreshCw, Pencil, Cloud } from "lucide-react";
import type { BriefingListRow } from "../types";
import { fmtRelative } from "./Inputs";

export function ListView({
  list,
  loading,
  error,
  onOpen,
  onNew,
  onDelete,
  onRefresh,
}: {
  list: BriefingListRow[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = list.filter((b) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.title || "").toLowerCase().includes(q) ||
      (b.wedding_date || "").includes(q)
    );
  });

  return (
    <div className="max-w-[1360px] mx-auto w-full px-7 py-10">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#8892B0] mb-2">
            Espace DJ
          </div>
          <h1 className="text-[34px] font-semibold tracking-tight">Mes briefings</h1>
          <p className="text-sm text-[#B8C1DB] mt-2 max-w-md">
            Collectez toutes les infos d'un mariage en une seule fiche. Chaque section
            est enregistrée indépendamment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#1B2238] text-[#B8C1DB] text-[13px] hover:bg-[#0F1424] hover:text-white hover:border-[#252D47] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Rafraîchir
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors"
            style={{ background: "var(--brief-accent,#A855F7)", color: "#0B0F1A" }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Nouveau brief
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1B2238] overflow-hidden"
           style={{ background: "linear-gradient(180deg,#0F1424,#0B0F1A)" }}>
        <div className="px-5 py-3 border-b border-[#1B2238] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6485]" />
            <input
              className="w-full rounded-lg border border-[#1B2238] bg-[#0F1424] pl-9 pr-3 py-2 text-sm text-[#E5E9F5] placeholder:text-[#5A6485] focus:outline-none focus:border-[var(--brief-accent,#A855F7)]"
              placeholder="Rechercher par couple ou date…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="text-[11.5px] text-[#8892B0] font-mono ml-auto">
            {filtered.length} {filtered.length > 1 ? "fiches" : "fiche"}
          </span>
        </div>

        {error && (
          <div className="px-5 py-4 text-[13px] text-red-300 border-b border-red-900/40 bg-red-950/20">
            Erreur : {error}
          </div>
        )}

        {loading && list.length === 0 ? (
          <div className="py-20 text-center text-[#8892B0] text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-[#B8C1DB] text-[15px] mb-4">Aucun brief pour l'instant.</div>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold mx-auto"
              style={{ background: "var(--brief-accent,#A855F7)", color: "#0B0F1A" }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Créer le premier
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1B2238]">
            {filtered.map((b) => (
              <BriefingRow key={b.id} b={b} onOpen={() => onOpen(b.id)} onDelete={() => onDelete(b.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-[#8892B0]">
        <Cloud className="w-3.5 h-3.5" />
        Vos briefings sont synchronisés avec votre compte (Supabase, RLS par utilisateur).
      </div>
    </div>
  );
}

function BriefingRow({
  b,
  onOpen,
  onDelete,
}: {
  b: BriefingListRow;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const date = b.wedding_date
    ? new Date(b.wedding_date + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Date à définir";
  const shortDate = b.wedding_date
    ? new Date(b.wedding_date + "T00:00:00")
        .toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
        .toUpperCase()
        .replace(".", "")
    : "—";

  return (
    <div
      className="group flex items-center gap-5 px-5 py-4 hover:bg-[#0F1424]/70 transition-colors cursor-pointer"
      onClick={onOpen}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center font-mono text-[11px] tracking-wider shrink-0 border"
        style={{
          background: "color-mix(in oklab, var(--brief-accent,#A855F7) 14%, #0F1424)",
          color: "var(--brief-accent,#A855F7)",
          borderColor: "color-mix(in oklab, var(--brief-accent,#A855F7) 28%, #1B2238)",
        }}
      >
        {shortDate}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold tracking-tight truncate">
          {b.title || "Sans titre"}
        </div>
        <div className="text-[12.5px] text-[#B8C1DB] mt-0.5 font-mono">
          {date} · maj {fmtRelative(b.updated_at)}
        </div>
      </div>
      <div
        className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {confirm ? (
          <>
            <span className="text-xs text-[#B8C1DB] mr-1">Supprimer ?</span>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3A1F2A] text-red-400 text-[12px] hover:bg-[#1A0E15]"
            >
              <Trash2 className="w-3.5 h-3.5" /> Oui
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-3 py-1.5 rounded-lg border border-[#1B2238] text-[#B8C1DB] text-[12px] hover:bg-[#0F1424]"
            >
              Non
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1B2238] text-[#B8C1DB] text-[12px] hover:bg-[#0F1424] hover:text-white"
            >
              <Pencil className="w-3.5 h-3.5" /> Ouvrir
            </button>
            <button
              onClick={() => setConfirm(true)}
              aria-label="Supprimer"
              className="p-1.5 rounded-lg border border-[#1B2238] text-[#B8C1DB] hover:bg-[#0F1424] hover:text-red-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
