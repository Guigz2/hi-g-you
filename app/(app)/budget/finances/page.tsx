"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Treemap,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

type Row = { id: string; desc: string; amount: number | string; category: string; date: string };
type MonthlyPayment = { id: string; desc: string; amount: number | string; category: string; type: string };

type Mode = "month" | "year";

function getMonthBounds(ym: string) {
  // ym in format YYYY-MM
  const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return {
    startISO: start.toISOString().slice(0, 10),
    endISO: end.toISOString().slice(0, 10),
  };
}

function getYearBounds(year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return {
    startISO: start.toISOString().slice(0, 10),
    endISO: end.toISOString().slice(0, 10),
  };
}

const categoryPalette = [
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f87171", // red-400
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
  "#22d3ee", // cyan-400
  "#fb7185", // rose-400
  "#93c5fd", // blue-300
  "#86efac", // green-300
];

function numberToFixed(n: number | string, d = 2) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return isFinite(v) ? v.toFixed(d) : "0.00";
}

export default function FinancesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState<string>(defaultMonth); // YYYY-MM
  const [year, setYear] = useState<number>(now.getFullYear());

  const [tx, setTx] = useState<Row[]>([]);
  const [credits, setCredits] = useState<Row[]>([]);
  const [mens, setMens] = useState<MonthlyPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Treemap category filters
  const [txTreemapCategory, setTxTreemapCategory] = useState<string>("");
  const [crTreemapCategory, setCrTreemapCategory] = useState<string>("");

  // Handler pour changer de vue et reset des filtres associés
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    const nowLocal = new Date();
    const fallbackMonth = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, "0")}`;
    if (newMode === "month") {
      setMonth(fallbackMonth);
    } else {
      setYear(nowLocal.getFullYear());
    }
    // Reset des filtres spécifiques
    setTxTreemapCategory("");
    setCrTreemapCategory("");
  };

  // Reset des filtres aussi quand on change le mois ou l'année manuellement
  const handleMonthChange = (value: string) => {
    setMonth(value);
    setTxTreemapCategory("");
    setCrTreemapCategory("");
  };
  const handleYearChange = (value: number) => {
    setYear(value);
    setTxTreemapCategory("");
    setCrTreemapCategory("");
  };

  const { startISO, endISO } = useMemo(() => {
    return mode === "month" ? getMonthBounds(month) : getYearBounds(year);
  }, [mode, month, year]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setTx([]);
          setCredits([]);
          setMens([]);
          return;
        }
        // Fetch filtered transactions scoped by user
        const [{ data: txData, error: txErr }, { data: crData, error: crErr }, { data: mpData, error: mpErr }] =
          await Promise.all([
            supabase
              .from("transactions")
              .select("id, desc, amount, category, date")
              .eq("user_id", user.id)
              .gte("date", startISO)
              .lt("date", endISO),
            supabase
              .from("credits")
              .select("id, desc, amount, category, date")
              .eq("user_id", user.id)
              .gte("date", startISO)
              .lt("date", endISO),
            supabase
              .from("monthly_payment")
              .select("id, desc, amount, category, type")
              .eq("user_id", user.id),
          ]);

        if (txErr) throw txErr;
        if (crErr) throw crErr;
        if (mpErr) throw mpErr;

        setTx((txData || []).map((r) => ({ ...r, id: String(r.id) })) as Row[]);
        setCredits((crData || []).map((r) => ({ ...r, id: String(r.id) })) as Row[]);
        setMens((mpData || []).map((r) => ({ ...r, id: String(r.id) })) as MonthlyPayment[]);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement des données");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [supabase, startISO, endISO]);

  function sumByCategory(rows: Row[]) {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.category || "Sans catégorie";
      const v = typeof r.amount === "string" ? parseFloat(r.amount) : r.amount;
      map.set(key, (map.get(key) || 0) + (isFinite(v) ? v : 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  function groupByDescription(rows: Row[]) {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.desc || "(sans description)";
      const v = typeof r.amount === "string" ? parseFloat(r.amount) : r.amount;
      map.set(key, (map.get(key) || 0) + (isFinite(v) ? v : 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  const txByCat = useMemo(() => sumByCategory(tx), [tx]);
  const crByCat = useMemo(() => sumByCategory(credits), [credits]);

  // Map catégorie -> couleur pour usages discrets (bordure / pastille)
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    [...new Set([...txByCat.map(c => c.name), ...crByCat.map(c => c.name)])].forEach(name => {
      map.set(name, categoryPalette[i % categoryPalette.length]);
      i++;
    });
    return map;
  }, [txByCat, crByCat]);

  const categoriesAll = useMemo(() => {
    const set = new Set<string>();
    tx.forEach((r) => set.add(r.category));
    credits.forEach((r) => set.add(r.category));
    return Array.from(set).filter(Boolean).sort();
  }, [tx, credits]);

  // Treemap data logic
  const txTreemapData = useMemo(() => {
    if (!txTreemapCategory) {
      return txByCat.map((d) => ({ name: d.name, size: d.value }));
    }
    const filtered = tx.filter((r) => r.category === txTreemapCategory);
    return groupByDescription(filtered).map((d) => ({ name: d.name, size: d.value }));
  }, [tx, txByCat, txTreemapCategory]);

  const crTreemapData = useMemo(() => {
    if (!crTreemapCategory) {
      return crByCat.map((d) => ({ name: d.name, size: d.value }));
    }
    const filtered = credits.filter((r) => r.category === crTreemapCategory);
    return groupByDescription(filtered).map((d) => ({ name: d.name, size: d.value }));
  }, [credits, crByCat, crTreemapCategory]);

  // Mensualités: résumer par catégorie (somme des templates)
  const mensByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of mens) {
      const v = typeof m.amount === "string" ? parseFloat(m.amount) : m.amount;
      const key = `${m.type || "Autre"} • ${m.category || "Sans catégorie"}`;
      map.set(key, (map.get(key) || 0) + (isFinite(v) ? v : 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [mens]);

  // Custom label for Pie slices (pourcentage)
  const renderPieLabel = (props: any) => {
    const { percent, x, y } = props;
    if (percent < 0.03) return null; // éviter le bruit sur très petites parts
    return (
      <text
        x={x}
        y={y}
        fill="#111"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        className="dark:fill-white"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Tooltip treemap dépenses
  const renderTxTreemapTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    const total = txTreemapData.reduce((s, d) => s + (d.size || 0), 0) || 1;
    const pct = ((item.size / total) * 100).toFixed(1);
    return (
      <div className="p-2 rounded border bg-white dark:bg-neutral-800 dark:border-neutral-700 text-xs space-y-1">
        <div className="font-medium truncate max-w-[160px]" title={item.name}>{item.name}</div>
        <div>{numberToFixed(item.size)} € • {pct}%</div>
      </div>
    );
  };
  // Tooltip treemap crédits
  const renderCrTreemapTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    const total = crTreemapData.reduce((s, d) => s + (d.size || 0), 0) || 1;
    const pct = ((item.size / total) * 100).toFixed(1);
    return (
      <div className="p-2 rounded border bg-white dark:bg-neutral-800 dark:border-neutral-700 text-xs space-y-1">
        <div className="font-medium truncate max-w-[160px]" title={item.name}>{item.name}</div>
        <div>{numberToFixed(item.size)} € • {pct}%</div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Finances</h1>

      {/* Filtres période */}
      <div className="bg-gray-100 dark:bg-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm">Vue</label>
          <select
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as Mode)}
            className="p-2 border rounded bg-white dark:bg-neutral-900"
          >
            <option value="month">Mois</option>
            <option value="year">Année</option>
          </select>

          {mode === "month" ? (
            <input
              type="month"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="p-2 border rounded bg-white dark:bg-neutral-900"
            />
          ) : (
            <input
              type="number"
              value={year}
              onChange={(e) => handleYearChange(parseInt(e.target.value || String(now.getFullYear()), 10))}
              className="p-2 border rounded bg-white dark:bg-neutral-900 w-24"
            />
          )}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">Période: {startISO} → {endISO}</p>
        {error && (
          <div className="p-2 rounded bg-red-100 text-red-700 text-sm">{error}</div>
        )}
      </div>

      {/* Dépenses: Pie + Tableau */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-gray-200 dark:border-neutral-700">
          <h2 className="font-semibold mb-3">Dépenses par catégorie</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={txByCat}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {txByCat.map((entry, idx) => (
                    <Cell key={`tx-slice-${idx}`} fill={categoryPalette[idx % categoryPalette.length]} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v: any) => `${numberToFixed(v)} €`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-gray-200 dark:border-neutral-700">
          <h2 className="font-semibold mb-3">Détails des dépenses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-neutral-700">
                  <th className="py-2 pr-4">Catégorie</th>
                  <th className="py-2 text-right">Montant (€)</th>
                </tr>
              </thead>
              <tbody>
                {txByCat.map((r) => (
                  <tr
                    key={r.name}
                    className="border-b border-gray-100 dark:border-neutral-800"
                    style={{ borderLeft: `4px solid ${categoryColorMap.get(r.name) || "transparent"}` }}
                  >
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoryColorMap.get(r.name) || "#ccc" }}
                        />
                        {r.name}
                      </span>
                    </td>
                    <td className="py-2 text-right">{numberToFixed(r.value)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-4 font-semibold">Total</td>
                  <td className="py-2 text-right font-semibold">
                    {numberToFixed(txByCat.reduce((s, r) => s + (r.value || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Crédits: Pie + Tableau */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-gray-200 dark:border-neutral-700">
          <h2 className="font-semibold mb-3">Crédits par catégorie</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={crByCat}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {crByCat.map((entry, idx) => (
                    <Cell key={`cr-slice-${idx}`} fill={categoryPalette[idx % categoryPalette.length]} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v: any) => `${numberToFixed(v)} €`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-gray-200 dark:border-neutral-700">
          <h2 className="font-semibold mb-3">Détails des crédits</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-neutral-700">
                  <th className="py-2 pr-4">Catégorie</th>
                  <th className="py-2 text-right">Montant (€)</th>
                </tr>
              </thead>
              <tbody>
                {crByCat.map((r) => (
                  <tr
                    key={r.name}
                    className="border-b border-gray-100 dark:border-neutral-800"
                    style={{ borderLeft: `4px solid ${categoryColorMap.get(r.name) || "transparent"}` }}
                  >
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoryColorMap.get(r.name) || "#ccc" }}
                        />
                        {r.name}
                      </span>
                    </td>
                    <td className="py-2 text-right">{numberToFixed(r.value)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-4 font-semibold">Total</td>
                  <td className="py-2 text-right font-semibold">
                    {numberToFixed(crByCat.reduce((s, r) => s + (r.value || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Treemap Dépenses */}
      <section className="grid grid-cols-1 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Treemap Dépenses</h2>
          <select
            value={txTreemapCategory}
            onChange={(e) => setTxTreemapCategory(e.target.value)}
            className="p-2 border rounded bg-white dark:bg-neutral-900"
          >
            <option value="">Toutes catégories</option>
            {categoriesAll.map((c) => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-2 border border-gray-200 dark:border-neutral-700 h-80">
          <ResponsiveContainer>
            <Treemap
              data={txTreemapData}
              dataKey="size"
              nameKey="name"
              stroke="#fff"
              fill="#60a5fa"
            >
              <ReTooltip content={renderTxTreemapTooltip} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Treemap Crédits */}
      <section className="grid grid-cols-1 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Treemap Crédits</h2>
          <select
            value={crTreemapCategory}
            onChange={(e) => setCrTreemapCategory(e.target.value)}
            className="p-2 border rounded bg-white dark:bg-neutral-900"
          >
            <option value="">Toutes catégories</option>
            {categoriesAll.map((c) => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-2 border border-gray-200 dark:border-neutral-700 h-80">
          <ResponsiveContainer>
            <Treemap
              data={crTreemapData}
              dataKey="size"
              nameKey="name"
              stroke="#fff"
              fill="#34d399"
            >
              <ReTooltip content={renderCrTreemapTooltip} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Mensualités: Bar chart */}
      <section className="grid grid-cols-1 gap-3">
        <h2 className="font-semibold">Mensualités (somme des modèles)</h2>
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-2 border border-gray-200 dark:border-neutral-700 h-80">
          <ResponsiveContainer>
            <BarChart data={mensByCat} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide={false} interval={0} tick={{ fontSize: 10 }} />
              <YAxis />
              <ReTooltip formatter={(v: any) => `${numberToFixed(v)} €`} />
              <Legend />
              <Bar dataKey="value" fill="#a78bfa" name="Montant (€)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {loading && (
        <div className="text-sm text-gray-600 dark:text-gray-400">Chargement…</div>
      )}
    </div>
  );
}
