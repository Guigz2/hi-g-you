"use client";
import Link from "next/link";
import { Home, ChevronDown, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function TopBar() {
  const router = useRouter();
  const params = useSearchParams();
  const current = useMemo(() => ({
    scope: (params.get("scope") || "perso") as "perso" | "travail",
    type: (params.get("type") || "tous"),
    importance: (params.get("importance") || "tous"),
    status: (params.get("status") || "tous"),
    location: (params.get("location") || "tous"),
    duration: (params.get("duration") || "tous"),
  }), [params]);
  const nextValue = (key: keyof typeof current, all: string[]) => {
    const v = current[key] || all[0];
    const idx = all.indexOf(v);
    return all[(idx + 1) % all.length];
  };

  const setParam = (key: string, val: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set(key, val);
    router.push(`?${sp.toString()}`);
  };

  const groups = [
    { key: "scope", label: "Périmètre", caption: "", value: current.scope === "perso" ? "Perso" : "Travail", color: "bg-rose-300", options: ["perso","travail"] },
    { key: "type", label: "Type", caption: "Filtrer par :", value: (current.type as string).toString().replace(/^./, s=>s.toUpperCase()), color: "bg-indigo-300", options: ["tous","loisir","menage","travail"] },
    { key: "importance", label: "Importance", caption: "", value: (current.importance as string).replace(/^./, s=>s.toUpperCase()), color: "bg-cyan-300", options: ["tous","petite","moyenne","grande","urgente"] },
    { key: "status", label: "Etat", caption: "", value: (current.status as string).replace(/^./, s=>s.toUpperCase()), color: "bg-green-300", options: ["tous","a_faire","en_cours","fini"] },
    { key: "location", label: "Lieu", caption: "", value: (current.location as string).replace(/^./, s=>s.toUpperCase()), color: "bg-orange-300", options: ["tous","partout","maison","travail"] },
    { key: "duration", label: "Durée", caption: "", value: (current.duration as string).replace(/^./, s=>s.toUpperCase()), color: "bg-violet-300", options: ["tous","courte","moyenne","longue"] },
  ] as const;

  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-neutral-900 border-b dark:border-neutral-800" ref={containerRef}>
      <div className="flex items-center">
        <Link href="/" className="w-16 h-16 flex items-center justify-center">
          <Home className="w-10 h-10" />
        </Link>
        <div className="flex-1 flex items-start">
          {groups.map((g, i) => (
            <div key={g.label} className={`px-4 border-l dark:border-neutral-800`}>
              <div className="text-center text-xs text-gray-700 dark:text-gray-300 mb-1">{g.label}</div>
              <div className="flex items-center gap-3">
                {g.caption && <div className="text-xs text-gray-600 dark:text-gray-400">{g.caption}</div>}
                <div className="relative inline-block">
                  <button
                    onClick={() => setOpenKey((k) => (k === g.key ? null : g.key))}
                    className={`flex items-center gap-2 ${g.color} px-3 py-1 rounded-xl shadow-sm`}
                    aria-haspopup="listbox"
                    aria-expanded={openKey === g.key}
                  >
                    <span className="text-sm text-black">{g.value}</span>
                    <ChevronDown className="w-4 h-4 text-black" />
                  </button>
                  {openKey === g.key && (
                    <div className="absolute left-0 mt-2 w-44 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden z-50">
                      <ul role="listbox" className="max-h-64 overflow-auto py-1">
                        {g.options.map((opt) => {
                          const selected = String(params.get(g.key) ?? (g.key === "scope" ? "perso" : "tous")) === opt;
                          const label = opt.replace(/^./, s=>s.toUpperCase());
                          return (
                            <li
                              key={opt}
                              role="option"
                              aria-selected={selected}
                              onClick={() => { setParam(g.key, opt); setOpenKey(null); }}
                              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 ${selected ? "text-black dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
                            >
                              <span>{g.key === "scope" ? (opt === "perso" ? "Perso" : "Travail") : label}</span>
                              {selected && <Check className="w-4 h-4" />}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
