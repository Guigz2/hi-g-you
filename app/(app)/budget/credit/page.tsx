"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CreditRow = {
  id: string;
  desc: string;
  amount: number | string;
  category: string;
  date: string;
};

interface Credit {
  id?: string;
  description: string;
  amount: string; // keep as string for the form input; cast to number for DB
  category: string;
  date: string; // ISO yyyy-mm-dd
}

const creditCategories = [
  "Salaire",
  "Prime",
  "Remboursement",
  "Revenu passif",
  "Autres",
] as const;

const categoryColors: Record<string, string> = {
  Salaire: "bg-green-200",
  Prime: "bg-blue-200",
  Remboursement: "bg-yellow-200",
  "Revenu passif": "bg-purple-200",
  Autres: "bg-gray-200",
};
// Variante douce pour les cartes mobile (moins saturé)
const softCategoryColors: Record<string, string> = {
  Salaire: "bg-green-50 dark:bg-green-900/30",
  Prime: "bg-blue-50 dark:bg-blue-900/30",
  Remboursement: "bg-yellow-50 dark:bg-yellow-900/30",
  "Revenu passif": "bg-purple-50 dark:bg-purple-900/30",
  Autres: "bg-gray-50 dark:bg-gray-800/40",
};

export default function BudgetCreditsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [credits, setCredits] = useState<Credit[]>([]);
  const [formData, setFormData] = useState<Credit>({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      setError(null);
      const { data, error } = await supabase
        .from("credits")
        .select("id, desc, amount, category, date")
        .order("date", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }
      if (data) {
        const mapped: Credit[] = data.map((c: CreditRow) => ({
          id: String(c.id),
          description: c.desc,
          amount: String(c.amount ?? ""),
          category: c.category,
          date: c.date,
        }));
        setCredits(mapped);
      }
    };
    fetchCredits();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      desc: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("credits")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;

        setCredits((prev) =>
          prev
            .map((c) => (c.id === editingId ? { ...formData, id: editingId } : c))
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
        );
        setEditingId(null);
      } else {
        const { data, error } = await supabase
          .from("credits")
          .insert([payload])
          .select("id, desc, amount, category, date")
          .single();
        if (error) throw error;
        if (data) {
          const inserted: Credit = {
            id: String(data.id),
            description: data.desc,
            amount: String(data.amount ?? ""),
            category: data.category,
            date: data.date,
          };
          setCredits((prev) =>
            [...prev, inserted].sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
          );
        }
      }

      setFormData({
        description: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (credit?: Credit) => {
    if (!credit?.id) return;
    const confirmText = `Confirmer la suppression:\n\nDescription: ${credit.description}\nMontant: ${credit.amount} €\nCatégorie: ${credit.category}\nDate: ${new Date(credit.date).toLocaleDateString()}`;
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;
    const { error } = await supabase.from("credits").delete().eq("id", credit.id);
    if (!error) {
      setCredits((prev) => prev.filter((c) => c.id !== credit.id));
    }
  };

  const handleEdit = (credit: Credit) => {
    setFormData(credit);
    setEditingId(credit.id || null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getTotalForCurrentMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const total = credits
      .filter((credit) => {
        const d = new Date(credit.date);
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
      })
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    return total.toFixed(2);
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-center">💰 Mes Crédits 💰</h1>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-100 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            className="p-2 border rounded bg-white dark:bg-neutral-900 min-w-0"
          />
          <input
            type="number"
            step="0.01"
            name="amount"
            placeholder="Montant"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            className="p-2 border rounded bg-white dark:bg-neutral-900 min-w-0"
          />
          <select
            name="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            className="p-2 border rounded bg-white dark:bg-neutral-900 sm:col-span-1 min-w-0"
          >
            <option value="" disabled>
              Catégorie
            </option>
            {creditCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div className="flex flex-col">
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="p-2 border rounded bg-white dark:bg-neutral-900 min-w-0 w-full overflow-hidden text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white p-2 rounded w-full"
        >
          {editingId ? "Modifier" : "Ajouter"}
        </button>
      </form>

      <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 rounded-lg text-green-800 dark:text-green-200 font-bold text-lg">
        💰 Total des crédits du mois : {getTotalForCurrentMonth()} €
      </div>

      {/* Vue cartes mobile */}
      <div className="mt-6 space-y-3 sm:hidden">
        {credits.map((credit) => (
          <div
            key={credit.id}
            className={`rounded border border-gray-300 dark:border-neutral-700 p-3 flex justify-between gap-3 ${softCategoryColors[credit.category] || 'bg-white dark:bg-neutral-900'}`}
          >
            <div className="flex flex-col min-w-0 text-sm">
              <p className="font-medium truncate">{credit.description}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {new Date(credit.date).toLocaleDateString()} • {credit.category}
              </p>
              <div className="mt-2">
                <button
                  onClick={() => handleEdit(credit)}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  aria-label="Modifier crédit"
                >
                  ✏️ Modifier
                </button>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between">
              <p className="font-semibold text-sm">{credit.amount} €</p>
              <button
                onClick={() => handleDelete(credit)}
                className="text-red-600 hover:text-red-800 text-xs"
                aria-label="Supprimer crédit"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Tableau desktop */}
      <div className="mt-4 overflow-x-auto hidden sm:block table-wrapper">
        <table className="w-full border-collapse border border-gray-300 dark:border-neutral-700 text-sm">
        <thead>
          <tr className="bg-gray-200 dark:bg-neutral-800 border border-black dark:border-neutral-700">
            <th className="text-center p-2 border border-black dark:border-neutral-700">Description</th>
            <th className="text-center p-2 border border-black dark:border-neutral-700">Montant (€)</th>
            <th className="text-center p-2 border border-black dark:border-neutral-700">Catégorie</th>
            <th className="text-center p-2 border border-black dark:border-neutral-700">Date</th>
            <th className="text-center p-2 border border-black dark:border-neutral-700">Actions</th>
          </tr>
        </thead>
          <tbody>
            {credits.map((credit) => (
              <tr
                key={credit.id}
                className={`${categoryColors[credit.category] || "bg-white dark:bg-neutral-900"} border border-black dark:border-neutral-700 dark:text-black`}
              >
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap max-w-[180px] truncate" title={credit.description}>{credit.description}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{credit.amount}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{credit.category}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{new Date(credit.date).toLocaleDateString()}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 space-x-2 whitespace-nowrap">
                  <button onClick={() => handleEdit(credit)} className="text-blue-600 hover:text-blue-800">✏️</button>
                  <button onClick={() => handleDelete(credit)} className="text-red-600 hover:text-red-800">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
