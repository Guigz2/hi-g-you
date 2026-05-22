"use client";
import { Field, TextInput } from "../components/Inputs";
import type { Contacts } from "../types";

export function ContactsSection({
  value,
  onChange,
}: {
  value: Contacts;
  onChange: (v: Contacts) => void;
}) {
  const set = <K extends keyof Contacts>(k: K, x: Contacts[K]) =>
    onChange({ ...value, [k]: x });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Les mariés
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field>
            <TextInput
              value={value.partner_a}
              onChange={(x) => set("partner_a", x)}
              placeholder="Prénom Nom"
            />
          </Field>
          <Field>
            <TextInput
              value={value.partner_b}
              onChange={(x) => set("partner_b", x)}
              placeholder="Prénom Nom"
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Référent sur place le jour J
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Nom">
            <TextInput
              value={value.onsite_name}
              onChange={(x) => set("onsite_name", x)}
              placeholder="Prénom Nom — rôle"
            />
          </Field>
          <Field label="Téléphone">
            <TextInput
              value={value.onsite_phone}
              onChange={(x) => set("onsite_phone", x)}
              placeholder="+33 6 12 34 56 78"
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8892B0] mb-2">
          Wedding planner
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Agence / Nom">
            <TextInput
              value={value.planner_name}
              onChange={(x) => set("planner_name", x)}
              placeholder="Atelier — Prénom"
            />
          </Field>
          <Field label="Téléphone">
            <TextInput
              value={value.planner_phone}
              onChange={(x) => set("planner_phone", x)}
              placeholder="+33 6 98 76 54 32"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
