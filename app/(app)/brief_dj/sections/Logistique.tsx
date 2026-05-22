"use client";
import { Field, TextInput, TextArea, TimeInput, DateInput } from "../components/Inputs";
import type { Logistique } from "../types";

export function LogistiqueSection({
  value,
  onChange,
}: {
  value: Logistique;
  onChange: (v: Logistique) => void;
}) {
  const set = <K extends keyof Logistique>(k: K, x: Logistique[K]) =>
    onChange({ ...value, [k]: x });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Date du mariage">
          <DateInput value={value.date} onChange={(x) => set("date", x)} />
        </Field>
        <Field label="Nom du lieu">
          <TextInput
            value={value.venue_name}
            onChange={(x) => set("venue_name", x)}
            placeholder="Château, domaine, salle…"
          />
        </Field>
      </div>

      <Field label="Adresse complète">
        <TextInput
          value={value.address}
          onChange={(x) => set("address", x)}
          placeholder="Rue, code postal, ville"
        />
      </Field>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Déroulé de la journée
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            ["load_in", "Load-in"],
            ["cocktail", "Cocktail"],
            ["dinner", "Dîner"],
            ["party", "Soirée"],
            ["end_time", "Fin"],
          ] as const).map(([k, lbl]) => (
            <div key={k}>
              <div className="text-[11px] text-[#5A6485] mb-1.5">{lbl}</div>
              <TimeInput value={value[k]} onChange={(x) => set(k, x)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Couvre-feu / nuisances sonores"
          hint="Heure limite extérieure, voisinage, contraintes du lieu"
        >
          <TextArea
            value={value.curfew}
            onChange={(x) => set("curfew", x)}
            placeholder="Ex. : extérieur OK jusqu'à 1h, intérieur jusqu'à 4h"
            rows={3}
          />
        </Field>
        <Field
          label="Notes électricité / installation"
          hint="Tableau dédié, accès, distances câbles…"
        >
          <TextArea
            value={value.power_notes}
            onChange={(x) => set("power_notes", x)}
            placeholder="Ex. : tableau dédié 32A, accès cour ouest, 25m de câble nécessaire"
            rows={3}
          />
        </Field>
      </div>
    </div>
  );
}
