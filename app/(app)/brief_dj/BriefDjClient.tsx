"use client";
import { useState, useTransition } from "react";
import { Music } from "lucide-react";
import { listBriefings, getBriefing, deleteBriefing } from "./actions";
import type { Briefing, BriefingListRow } from "./types";
import { EMPTY_BRIEFING } from "./types";
import { ListView } from "./components/ListView";
import { EditorView } from "./components/EditorView";
import { PrintSheet } from "./components/PrintSheet";

type View = "list" | "editor";

export default function BriefDjClient({
  initialList,
}: {
  initialList: BriefingListRow[];
}) {
  const [view, setView] = useState<View>("list");
  const [list, setList] = useState<BriefingListRow[]>(initialList);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<Briefing | null>(null);
  const [, startTransition] = useTransition();

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listBriefings();
      setList(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setBriefing(EMPTY_BRIEFING());
    setView("editor");
  };

  const openExisting = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const b = await getBriefing(id);
      if (!b) {
        setError("Brief introuvable.");
        return;
      }
      setBriefing(b);
      setView("editor");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBriefing(id);
      setList((xs) => xs.filter((b) => b.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaved = (saved: Briefing) => {
    // Keep editor open, but update list cache (insert or move-to-top).
    if (!saved.id) return;
    setList((xs) => {
      const without = xs.filter((b) => b.id !== saved.id);
      return [
        {
          id: saved.id!,
          title: saved.title,
          wedding_date: saved.wedding_date,
          created_at: saved.created_at || new Date().toISOString(),
          updated_at: saved.updated_at || new Date().toISOString(),
        },
        ...without,
      ];
    });
  };

  const backToList = () => {
    setBriefing(null);
    setView("list");
    startTransition(refresh);
  };

  const handlePrint = (b: Briefing) => {
    setPrintTarget(b);
    // Wait for next tick so the PrintSheet is in the DOM.
    setTimeout(() => {
      window.print();
      // Keep printTarget mounted until the print dialog closes.
      setTimeout(() => setPrintTarget(null), 400);
    }, 60);
  };

  return (
    <div className="min-h-screen" style={{ background: "#070A14", color: "#E5E9F5" }}>
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(800px 400px at 12% -10%, color-mix(in oklab, var(--brief-accent,#A855F7) 14%, transparent), transparent 60%), radial-gradient(600px 300px at 100% 100%, color-mix(in oklab, var(--brief-accent,#A855F7) 8%, transparent), transparent 60%)",
        }}
      />
      <div className="relative z-10">
        {/* Top bar */}
        <div
          className="sticky top-0 z-30 backdrop-blur-xl border-b border-[#141A2E]"
          style={{ background: "rgba(7,10,20,.78)" }}
        >
          <div className="max-w-[1360px] mx-auto flex items-center gap-4 px-7 py-3.5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border"
                style={{
                  background:
                    "color-mix(in oklab, var(--brief-accent,#A855F7) 18%, #141A2E)",
                  borderColor:
                    "color-mix(in oklab, var(--brief-accent,#A855F7) 35%, #1B2238)",
                }}
              >
                <Music
                  className="w-3.5 h-3.5"
                  strokeWidth={2.2}
                  style={{ color: "var(--brief-accent,#A855F7)" }}
                />
              </div>
              <div className="leading-tight">
                <div className="text-[13.5px] font-semibold tracking-tight">Brief DJ</div>
                <div className="text-[10.5px] text-[#8892B0] font-mono uppercase tracking-wider">
                  {view === "list" ? "Mes briefings" : briefing?.title || "Nouveau brief"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-[1360px] mx-auto px-7 mt-4">
            <div className="px-4 py-3 rounded-lg border border-red-900/50 bg-red-950/30 text-red-300 text-[13px]">
              {error}
            </div>
          </div>
        )}

        {view === "list" ? (
          <ListView
            list={list}
            loading={loading}
            error={null}
            onOpen={openExisting}
            onNew={openNew}
            onDelete={handleDelete}
            onRefresh={refresh}
          />
        ) : briefing ? (
          <EditorView
            key={briefing.id || "new"}
            initial={briefing}
            onSaved={handleSaved}
            onBack={backToList}
            onPrint={handlePrint}
          />
        ) : null}
      </div>

      {printTarget && <PrintSheet briefing={printTarget} />}
    </div>
  );
}
