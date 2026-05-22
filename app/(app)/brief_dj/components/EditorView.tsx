"use client";
import { useState, useTransition } from "react";
import { Save, ArrowLeft, ChevronRight, Check, Printer, Loader2 } from "lucide-react";
import type { Briefing, BriefingData, SectionId } from "../types";
import { isSectionComplete } from "../types";
import { upsertBriefing } from "../actions";
import { SECTIONS } from "../sections/meta";
import { DateInput, fmtRelative } from "./Inputs";
import { LogistiqueSection } from "../sections/Logistique";
import { MusiqueSection } from "../sections/Musique";
import { PlaylistsSection } from "../sections/Playlists";
import { MicroSection } from "../sections/Micro";
import { ContactsSection } from "../sections/Contacts";
import { NotesSection } from "../sections/Notes";

export function EditorView({
  initial,
  onSaved,
  onBack,
  onPrint,
}: {
  initial: Briefing;
  onSaved: (b: Briefing) => void;
  onBack: () => void;
  onPrint: (b: Briefing) => void;
}) {
  const [briefing, setBriefing] = useState<Briefing>(initial);
  const [active, setActive] = useState<SectionId>("logistique");
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<SectionId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const setMeta = (patch: Partial<Briefing>) =>
    setBriefing((b) => ({ ...b, ...patch }));

  const setSectionData = <K extends SectionId>(id: K, val: BriefingData[K]) => {
    setBriefing((b) => ({ ...b, data: { ...b.data, [id]: val } }));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  const saveSection = async (id: SectionId) => {
    setErrorMsg(null);
    setSavingId(id);

    // Derive title / wedding_date from sections if missing.
    let title = briefing.title;
    if (!title) {
      const c = briefing.data.contacts;
      if (c.partner_a || c.partner_b) {
        title = [c.partner_a, c.partner_b].filter(Boolean).join(" & ");
      }
    }
    let wedding_date = briefing.wedding_date;
    if (!wedding_date && briefing.data.logistique.date) {
      wedding_date = briefing.data.logistique.date;
    }

    const now = new Date().toISOString();
    const nextSaved = { ...briefing.saved, [id]: now };

    try {
      const saved = await upsertBriefing({
        id: briefing.id,
        title: title || "",
        wedding_date: wedding_date || null,
        data: briefing.data,
        saved: nextSaved,
      });
      const merged: Briefing = {
        ...briefing,
        ...saved,
        title: saved.title || briefing.title,
        wedding_date: saved.wedding_date,
        saved: nextSaved,
      };
      setBriefing(merged);
      setDirty((d) => ({ ...d, [id]: false }));
      startTransition(() => onSaved(merged));
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  };

  const data = briefing.data;
  const completed = SECTIONS.filter((s) => isSectionComplete(s.id, data)).length;
  const meta = SECTIONS.find((s) => s.id === active)!;

  const renderActiveSection = () => {
    switch (active) {
      case "logistique":
        return <LogistiqueSection value={data.logistique} onChange={(v) => setSectionData("logistique", v)} />;
      case "musique":
        return <MusiqueSection value={data.musique} onChange={(v) => setSectionData("musique", v)} />;
      case "playlists":
        return <PlaylistsSection value={data.playlists} onChange={(v) => setSectionData("playlists", v)} />;
      case "micro":
        return <MicroSection value={data.micro} onChange={(v) => setSectionData("micro", v)} />;
      case "contacts":
        return <ContactsSection value={data.contacts} onChange={(v) => setSectionData("contacts", v)} />;
      case "notes":
        return <NotesSection value={data.notes} onChange={(v) => setSectionData("notes", v)} />;
    }
  };

  const idx = SECTIONS.findIndex((s) => s.id === active);
  const prev = SECTIONS[idx - 1];
  const next = SECTIONS[idx + 1];

  return (
    <div className="max-w-[1360px] mx-auto w-full px-7 py-8">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1B2238] text-[#B8C1DB] text-[13px] hover:bg-[#0F1424] hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Retour à la liste
        </button>
        <span className="text-[11.5px] text-[#8892B0] font-mono uppercase tracking-wider ml-auto">
          {completed}/6 sections
        </span>
        <button
          onClick={() => onPrint(briefing)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#1B2238] text-[#B8C1DB] text-[13px] hover:bg-[#0F1424] hover:text-white hover:border-[#252D47]"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
        </button>
      </div>

      <div className="flex items-end gap-5 flex-wrap mb-7">
        <div className="flex-1 min-w-[260px] max-w-xl">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-1.5">
            Couple
          </label>
          <input
            className="w-full rounded-lg border border-[#1B2238] bg-[#0F1424] px-3 py-2.5 text-[22px] font-semibold tracking-tight text-[#E5E9F5] placeholder:text-[#5A6485] focus:outline-none focus:border-[var(--brief-accent,#A855F7)]"
            placeholder="Prénom & Prénom"
            value={briefing.title || ""}
            onChange={(e) => setMeta({ title: e.target.value })}
          />
        </div>
        <div className="w-full md:w-52">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-1.5">
            Date du mariage
          </label>
          <DateInput
            value={briefing.wedding_date || data.logistique.date || null}
            onChange={(x) => setMeta({ wedding_date: x })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-7 items-start">
        {/* Sidebar */}
        <nav className="rounded-2xl border border-[#1B2238] p-3 md:sticky md:top-4 self-start"
             style={{ background: "linear-gradient(180deg,#0F1424,#0B0F1A)" }}>
          <div className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-[#8892B0] px-2.5 py-2">
            Sections
          </div>
          <div className="flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const complete = isSectionComplete(s.id, data);
              const isDirty = !!dirty[s.id];
              const isActive = s.id === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] cursor-pointer transition-colors border"
                  style={
                    isActive
                      ? {
                          background:
                            "color-mix(in oklab, var(--brief-accent,#A855F7) 14%, #0F1424)",
                          color: "#E5E9F5",
                          borderColor:
                            "color-mix(in oklab, var(--brief-accent,#A855F7) 35%, #1B2238)",
                        }
                      : { color: "#B8C1DB", borderColor: "transparent" }
                  }
                >
                  <span
                    className="font-mono text-[11px] w-[22px] h-[22px] inline-flex items-center justify-center rounded-md shrink-0"
                    style={
                      isActive
                        ? {
                            background: "var(--brief-accent,#A855F7)",
                            color: "#0B0F1A",
                            fontWeight: 600,
                          }
                        : { background: "#141A2E", color: "#5A6485" }
                    }
                  >
                    {s.num}
                  </span>
                  <span className="flex-1 text-left truncate">{s.label}</span>
                  {isDirty ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "#F0B440" }}
                    />
                  ) : complete ? (
                    <Check
                      className="w-4 h-4 shrink-0"
                      strokeWidth={3}
                      style={{ color: "var(--brief-accent,#A855F7)" }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="h-px bg-[#1B2238] my-3" />
          <div className="px-2.5 py-1.5 text-xs text-[#8892B0] leading-snug">
            <span className="text-[#B8C1DB]">Astuce :</span> chaque section est enregistrée
            séparément. Vous pouvez quitter et revenir à tout moment.
          </div>
        </nav>

        {/* Main panel */}
        <div className="min-w-0">
          <div className="rounded-2xl border border-[#1B2238] overflow-hidden"
               style={{ background: "linear-gradient(180deg,#0F1424,#0B0F1A)" }}>
            <div className="flex items-start justify-between gap-4 px-5 sm:px-7 py-5 border-b border-[#1B2238] flex-wrap">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-[19px] font-semibold tracking-tight text-[#E5E9F5]">
                    {meta.label}
                  </h2>
                  {dirty[active] ? (
                    <span className="badge-warn inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono uppercase tracking-wider"
                          style={{ background: "#2A1F0E", color: "#F0B440" }}>
                      Modifications non enregistrées
                    </span>
                  ) : briefing.saved[active] ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono uppercase tracking-wider"
                          style={{
                            background:
                              "color-mix(in oklab, var(--brief-accent,#A855F7) 14%, transparent)",
                            color: "var(--brief-accent,#A855F7)",
                          }}>
                      <Check className="w-3 h-3" strokeWidth={3} /> Enregistré
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono uppercase tracking-wider bg-[#141A2E] text-[#5A6485]">
                      Brouillon
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[#B8C1DB] mt-1">{meta.subtitle}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {briefing.saved[active] && (
                  <span className="text-[11.5px] text-[#8892B0] font-mono">
                    {fmtRelative(briefing.saved[active])}
                  </span>
                )}
                <button
                  onClick={() => saveSection(active)}
                  disabled={savingId === active}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-60"
                  style={{ background: "var(--brief-accent,#A855F7)", color: "#0B0F1A" }}
                >
                  {savingId === active ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.2} />
                  ) : (
                    <Save className="w-3.5 h-3.5" strokeWidth={2.2} />
                  )}
                  {savingId === active ? "Enregistrement…" : "Enregistrer la section"}
                </button>
              </div>
            </div>
            {errorMsg && (
              <div className="px-7 py-3 text-[13px] text-red-300 bg-red-950/20 border-b border-red-900/40">
                Erreur : {errorMsg}
              </div>
            )}
            <div className="px-5 sm:px-7 py-6">{renderActiveSection()}</div>
          </div>

          <div className="flex items-center justify-between mt-5">
            <div>
              {prev && (
                <button
                  onClick={() => setActive(prev.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#1B2238] text-[#B8C1DB] text-[13px] hover:bg-[#0F1424] hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> {prev.label}
                </button>
              )}
            </div>
            <div>
              {next && (
                <button
                  onClick={() => setActive(next.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#1B2238] text-[#B8C1DB] text-[13px] hover:bg-[#0F1424] hover:text-white"
                >
                  {next.label} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
