"use client";
import { Field, TextInput, TextArea, TagInput, Segmented } from "../components/Inputs";
import type { Playlists, EnergyLevel } from "../types";

export function PlaylistsSection({
  value,
  onChange,
}: {
  value: Playlists;
  onChange: (v: Playlists) => void;
}) {
  const set = <K extends keyof Playlists>(k: K, x: Playlists[K]) =>
    onChange({ ...value, [k]: x });

  return (
    <div className="space-y-6">
      <Field
        label="Must-play"
        hint="Ces titres doivent passer impérativement — Entrée pour ajouter."
      >
        <TagInput
          value={value.must_play}
          onChange={(x) => set("must_play", x)}
          placeholder="Titre — Artiste"
          accent
        />
      </Field>

      <Field label="Do not play" hint="Titres ou artistes à éviter coûte que coûte.">
        <TagInput
          value={value.do_not_play}
          onChange={(x) => set("do_not_play", x)}
          placeholder="Titre, artiste ou genre"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Genres préférés">
          <TagInput
            value={value.preferred_genres}
            onChange={(x) => set("preferred_genres", x)}
            placeholder="Disco, House, RnB…"
          />
        </Field>
        <Field label="Artistes préférés">
          <TagInput
            value={value.preferred_artists}
            onChange={(x) => set("preferred_artists", x)}
            placeholder="Beyoncé, Justice…"
          />
        </Field>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Profil des invités
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Tranche d'âge">
            <TextInput
              value={value.age_range}
              onChange={(x) => set("age_range", x)}
              placeholder="Ex. : 25–65"
            />
          </Field>
          <Field label="Nationalités">
            <TextInput
              value={value.nationalities}
              onChange={(x) => set("nationalities", x)}
              placeholder="FR · MA · UK…"
            />
          </Field>
          <Field label="Énergie attendue">
            <Segmented<EnergyLevel>
              value={value.energy_level || "moyenne"}
              onChange={(x) => set("energy_level", x)}
              options={[
                { value: "calme", label: "calme" },
                { value: "moyenne", label: "moyenne" },
                { value: "haute", label: "haute" },
              ]}
            />
          </Field>
        </div>
      </div>

      <Field
        label="Notes sur le public"
        hint="Particularités, sensibilités, conseils des mariés"
      >
        <TextArea
          value={value.guest_notes}
          onChange={(x) => set("guest_notes", x)}
          placeholder="Ex. : public connaisseur côté A, classique côté B"
          rows={3}
        />
      </Field>
    </div>
  );
}
