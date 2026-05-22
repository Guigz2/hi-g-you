"use client";
import { Field, TextArea } from "../components/Inputs";
import type { NotesSlice } from "../types";

export function NotesSection({
  value,
  onChange,
}: {
  value: NotesSlice;
  onChange: (v: NotesSlice) => void;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Notes libres"
        hint="Tout ce qui ne rentre pas ailleurs : coordination, sensibilités, points d'attention…"
      >
        <TextArea
          value={value.free}
          onChange={(x) => onChange({ ...value, free: x })}
          placeholder="Écrire en toute liberté — sera repris tel quel dans le brief final."
          rows={14}
        />
      </Field>
    </div>
  );
}
