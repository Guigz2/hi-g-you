"use client";
import { Field, TextInput, TextArea } from "../components/Inputs";
import type { Musique } from "../types";

export function MusiqueSection({
  value,
  onChange,
}: {
  value: Musique;
  onChange: (v: Musique) => void;
}) {
  const set = <K extends keyof Musique>(k: K, x: Musique[K]) =>
    onChange({ ...value, [k]: x });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Cérémonie
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Entrée">
            <TextInput
              value={value.ceremony_entry}
              onChange={(x) => set("ceremony_entry", x)}
              placeholder="Titre — Artiste"
            />
          </Field>
          <Field label="Sortie">
            <TextInput
              value={value.ceremony_exit}
              onChange={(x) => set("ceremony_exit", x)}
              placeholder="Titre — Artiste"
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Ambiances
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Cocktail" hint="Style, énergie, références">
            <TextInput
              value={value.cocktail_vibe}
              onChange={(x) => set("cocktail_vibe", x)}
              placeholder="Ex. : bossa moderne, soul lounge"
            />
          </Field>
          <Field label="Dîner" hint="Discret, fond sonore">
            <TextInput
              value={value.dinner_style}
              onChange={(x) => set("dinner_style", x)}
              placeholder="Ex. : french touch instrumentale"
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Moments clés
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Première danse">
            <TextInput
              value={value.first_dance}
              onChange={(x) => set("first_dance", x)}
              placeholder="Titre — Artiste"
            />
          </Field>
          <Field label="Gâteau">
            <TextInput
              value={value.cake_song}
              onChange={(x) => set("cake_song", x)}
              placeholder="Titre — Artiste"
            />
          </Field>
          <Field label="Dernière danse">
            <TextInput
              value={value.last_song}
              onChange={(x) => set("last_song", x)}
              placeholder="Titre — Artiste"
            />
          </Field>
        </div>
      </div>

      <Field
        label="Autres moments à marquer musicalement"
        hint="Arrivée des mariés, feu d'artifice, surprises, etc."
      >
        <TextArea
          value={value.key_moments}
          onChange={(x) => set("key_moments", x)}
          placeholder="Décrire les moments et l'effet musical attendu"
          rows={4}
        />
      </Field>
    </div>
  );
}
