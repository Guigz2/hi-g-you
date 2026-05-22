"use client";
import { Field, TextInput, TextArea, Segmented } from "../components/Inputs";
import type { Micro, DjVoice } from "../types";

export function MicroSection({
  value,
  onChange,
}: {
  value: Micro;
  onChange: (v: Micro) => void;
}) {
  const set = <K extends keyof Micro>(k: K, x: Micro[K]) =>
    onChange({ ...value, [k]: x });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Qui prend la parole ?" hint="Témoins, parents, surprises éventuelles">
          <TextArea
            value={value.speeches}
            onChange={(x) => set("speeches", x)}
            placeholder="Ex. : père de la mariée, témoins (x2), surprise des frères"
            rows={4}
          />
        </Field>
        <Field label="Quand ?" hint="Moment souhaité pour les prises de parole">
          <TextInput
            value={value.speech_time}
            onChange={(x) => set("speech_time", x)}
            placeholder="Ex. : entre l'entrée et le plat"
          />
          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-1.5">
              Rôle du DJ au micro
            </div>
            <Segmented<DjVoice>
              value={value.dj_voice || "annonces"}
              onChange={(x) => set("dj_voice", x)}
              options={[
                { value: "annonces", label: "Annonces" },
                { value: "minimal", label: "Minimal" },
                { value: "silencieux", label: "Silencieux" },
              ]}
            />
          </div>
        </Field>
      </div>

      <Field
        label="Jingles / transitions"
        hint="Moments à scénariser : arrivée, gâteau, dernière danse…"
      >
        <TextArea
          value={value.jingles}
          onChange={(x) => set("jingles", x)}
          placeholder="Ex. : entrée des mariés avec build-up, jingle gâteau, dernière danse"
          rows={3}
        />
      </Field>

      <Field
        label="Animation — à éviter / souhaité"
        hint="Karaoké, jeux, photobooth, etc."
      >
        <TextArea
          value={value.animation_notes}
          onChange={(x) => set("animation_notes", x)}
          placeholder="Ex. : pas de karaoké ni de jeux, photobooth géré par un autre prestataire"
          rows={3}
        />
      </Field>
    </div>
  );
}
