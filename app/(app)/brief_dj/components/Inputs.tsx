"use client";
import { ReactNode, useState } from "react";
import { Plus, X } from "lucide-react";

const fieldClass =
  "w-full rounded-lg border border-[#1B2238] bg-[#0F1424] px-3 py-2.5 text-sm text-[#E5E9F5] " +
  "placeholder:text-[#5A6485] transition-colors " +
  "focus:outline-none focus:border-[var(--brief-accent,#A855F7)] focus:bg-[#111729] " +
  "focus:ring-[3px] focus:ring-[color-mix(in_oklab,var(--brief-accent,#A855F7)_18%,transparent)]";

export function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-1.5">
          {label}
        </label>
      )}
      {children}
      {hint && <div className="text-xs text-[#5A6485] mt-1">{hint}</div>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClass}
    />
  );
}

export function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClass + " font-mono"}
    />
  );
}

export function DateInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClass + " font-mono"}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value || ""}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClass + " resize-y leading-relaxed min-h-[80px]"}
    />
  );
}

export function TagInput({
  value,
  onChange,
  placeholder,
  accent,
}: {
  value: string[] | undefined;
  onChange: (v: string[]) => void;
  placeholder?: string;
  accent?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const list = Array.isArray(value) ? value : [];

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (list.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...list, v]);
    setDraft("");
  };
  const remove = (i: number) => onChange(list.filter((_, j) => j !== i));

  return (
    <div>
      <div className="flex gap-2">
        <input
          className={fieldClass}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && list.length) {
              remove(list.length - 1);
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#1B2238] bg-transparent text-[#B8C1DB] text-[13px] hover:bg-[#0F1424] hover:text-white hover:border-[#252D47] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {list.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-[#141A2E] text-xs text-[#B8C1DB]"
              style={{
                borderColor: accent
                  ? "color-mix(in oklab, var(--brief-accent,#A855F7) 30%, #1B2238)"
                  : "#1B2238",
              }}
            >
              {t}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Retirer ${t}`}
                className="text-[#5A6485] hover:text-white transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={2.4} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex p-1 rounded-lg bg-[#0F1424] border border-[#1B2238]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex-1 text-[13px] py-1.5 rounded-md transition-colors capitalize"
            style={
              on
                ? { background: "var(--brief-accent,#A855F7)", color: "#0B0F1A", fontWeight: 600 }
                : { color: "#B8C1DB" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function fmtRelative(ts: string | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
