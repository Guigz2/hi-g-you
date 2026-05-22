"use client";
import type { Briefing } from "../types";

/**
 * Print-friendly briefing summary. Rendered inside a hidden container
 * (display:none on screen) and only visible during window.print().
 * The browser's "Save as PDF" works directly from print.
 */
export function PrintSheet({ briefing }: { briefing: Briefing }) {
  const d = briefing.data;
  const { logistique: L, musique: M, playlists: P, micro: Mi, contacts: C, notes: N } = d;

  const dateStr = briefing.wedding_date
    ? new Date(briefing.wedding_date + "T00:00:00").toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const Row = ({ label, val }: { label: string; val: string | null | undefined }) => (
    <div className="row">
      <div className="row-l">{label}</div>
      <div className="row-v">{val || "—"}</div>
    </div>
  );

  const Section = ({
    num,
    title,
    children,
  }: {
    num: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="print-section">
      <h2>
        <span className="num">{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="print-sheet">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-sheet, .print-sheet * { visibility: visible !important; }
          .print-sheet {
            position: absolute !important;
            inset: 0 !important;
            display: block !important;
            background: white !important;
            color: #0B0F1A !important;
          }
          @page { size: A4; margin: 18mm 16mm; }
        }
        .print-sheet {
          display: none;
          font-family: 'Inter', system-ui, sans-serif;
          color: #0B0F1A; background: white;
          max-width: 178mm; margin: 0 auto;
        }
        .print-sheet header {
          display: flex; justify-content: space-between; align-items: flex-end;
          border-bottom: 2px solid #0B0F1A; padding-bottom: 14px; margin-bottom: 22px;
        }
        .print-sheet header .brand {
          font-family: ui-monospace, 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
          color: #6B7280;
        }
        .print-sheet header h1 { font-size: 26px; font-weight: 700; margin: 4px 0 0; }
        .print-sheet header .date { font-size: 13px; color: #374151; text-align: right; }
        .print-sheet header .date b { display: block; font-size: 18px; color: #0B0F1A; }
        .print-section { page-break-inside: avoid; margin-bottom: 18px; }
        .print-section h2 {
          font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
          padding-bottom: 6px; border-bottom: 1px solid #D1D5DB;
          margin: 0 0 10px; display: flex; align-items: center; gap: 10px;
        }
        .print-section h2 .num {
          font-family: ui-monospace, monospace; font-size: 11px;
          background: #0B0F1A; color: #fff; padding: 2px 6px; border-radius: 4px;
        }
        .row { display: grid; grid-template-columns: 38% 1fr; gap: 12px; padding: 4px 0; font-size: 12.5px; }
        .row-l { color: #6B7280; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; }
        .timeline {
          display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
          margin: 4px 0 8px; padding: 10px 0;
          border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB;
        }
        .timeline div { text-align: center; }
        .timeline .t { font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700; }
        .timeline .l {
          font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
          color: #6B7280; margin-top: 2px;
        }
        .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag { font-size: 11.5px; padding: 3px 9px; border-radius: 999px; border: 1px solid #D1D5DB; background: #F9FAFB; }
        .tag.no { border-color: #FCA5A5; background: #FEF2F2; color: #991B1B; }
        .tag.yes { border-color: #0B0F1A; background: #0B0F1A; color: #fff; }
        .freenote {
          font-size: 12.5px; line-height: 1.55;
          background: #F9FAFB; border-left: 3px solid #0B0F1A;
          padding: 10px 14px; white-space: pre-wrap;
        }
        .footer {
          margin-top: 22px; padding-top: 12px; border-top: 1px solid #D1D5DB;
          display: flex; justify-content: space-between; font-size: 10px;
          color: #6B7280; font-family: ui-monospace, monospace;
          text-transform: uppercase; letter-spacing: .1em;
        }
      `}</style>

      <header>
        <div>
          <div className="brand">Brief DJ — Mariage</div>
          <h1>{briefing.title || "Brief sans titre"}</h1>
        </div>
        <div className="date">
          Date du mariage<br />
          <b>{dateStr}</b>
        </div>
      </header>

      <Section num="01" title="Logistique">
        <Row label="Lieu" val={L.venue_name} />
        <Row label="Adresse" val={L.address} />
        <div className="timeline">
          {[
            ["Load-in", L.load_in],
            ["Cocktail", L.cocktail],
            ["Dîner", L.dinner],
            ["Soirée", L.party],
            ["Fin", L.end_time],
          ].map(([l, t]) => (
            <div key={l}>
              <div className="t">{t || "—"}</div>
              <div className="l">{l}</div>
            </div>
          ))}
        </div>
        <Row label="Couvre-feu / nuisances" val={L.curfew} />
        <Row label="Électricité / installation" val={L.power_notes} />
      </Section>

      <Section num="02" title="Programme musical">
        <div className="grid-2">
          <Row label="Cérémonie — entrée" val={M.ceremony_entry} />
          <Row label="Cérémonie — sortie" val={M.ceremony_exit} />
          <Row label="Cocktail" val={M.cocktail_vibe} />
          <Row label="Dîner" val={M.dinner_style} />
          <Row label="Première danse" val={M.first_dance} />
          <Row label="Gâteau" val={M.cake_song} />
          <Row label="Dernière danse" val={M.last_song} />
        </div>
        {M.key_moments && <Row label="Autres moments" val={M.key_moments} />}
      </Section>

      <Section num="03" title="Playlists">
        {P.must_play.length > 0 && (
          <>
            <div className="row-l" style={{ fontSize: 12, marginBottom: 6, marginTop: 4 }}>
              Must-play
            </div>
            <div className="tag-list" style={{ marginBottom: 10 }}>
              {P.must_play.map((t, i) => (
                <span key={i} className="tag yes">{t}</span>
              ))}
            </div>
          </>
        )}
        {P.do_not_play.length > 0 && (
          <>
            <div className="row-l" style={{ fontSize: 12, marginBottom: 6 }}>Do not play</div>
            <div className="tag-list" style={{ marginBottom: 10 }}>
              {P.do_not_play.map((t, i) => (
                <span key={i} className="tag no">{t}</span>
              ))}
            </div>
          </>
        )}
        <div className="grid-2">
          <Row label="Genres préférés" val={P.preferred_genres.join(" · ")} />
          <Row label="Artistes préférés" val={P.preferred_artists.join(" · ")} />
          <Row label="Âges" val={P.age_range} />
          <Row label="Nationalités" val={P.nationalities} />
          <Row label="Énergie" val={P.energy_level} />
        </div>
        {P.guest_notes && <Row label="Notes public" val={P.guest_notes} />}
      </Section>

      <Section num="04" title="Micro & animation">
        <Row label="Prises de parole" val={Mi.speeches} />
        <Row label="Moment des discours" val={Mi.speech_time} />
        <Row label="Rôle du DJ" val={Mi.dj_voice} />
        <Row label="Jingles / transitions" val={Mi.jingles} />
        {Mi.animation_notes && <Row label="Animation" val={Mi.animation_notes} />}
      </Section>

      <Section num="05" title="Contacts">
        <div className="grid-2">
          <Row label="Marié·e A" val={C.partner_a} />
          <Row label="Marié·e B" val={C.partner_b} />
          <Row label="Référent sur place" val={C.onsite_name} />
          <Row label="Téléphone" val={C.onsite_phone} />
          <Row label="Wedding planner" val={C.planner_name} />
          <Row label="Téléphone" val={C.planner_phone} />
        </div>
      </Section>

      {N.free && (
        <Section num="06" title="Notes libres">
          <div className="freenote">{N.free}</div>
        </Section>
      )}

      <div className="footer">
        <span>Brief généré le {new Date().toLocaleDateString("fr-FR")}</span>
        <span>{briefing.id ? `ID — ${String(briefing.id).slice(0, 8)}` : ""}</span>
      </div>
    </div>
  );
}
