"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TxRow = {
  id: string;
  desc: string;
  amount: number | string;
  category: string;
  date: string;
};

interface Transaction {
  id?: string;
  description: string;
  amount: string; // keep string for input; cast to number on write
  category: string;
  date: string; // yyyy-mm-dd
}

const categories = [
  "Loisir",
  "Logement",
  "Santé/bien-être",
  "Transport",
  "Alimentation",
  "Frais bancaires exceptionnels",
  "Abonnement",
  "Retrait",
  "Autres",
] as const;

const categoryColors: Record<string, string> = {
  Loisir: "bg-purple-200",
  Logement: "bg-green-200",
  "Santé/bien-être": "bg-red-200",
  Transport: "bg-yellow-200",
  Alimentation: "bg-blue-200",
  "Frais bancaires exceptionnels": "bg-orange-200",
  Abonnement: "bg-teal-200",
  Retrait: "bg-gray-400",
  Autres: "bg-gray-200",
};

export default function BudgetTransactionsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formData, setFormData] = useState<Transaction>({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setError(null);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, desc, amount, category, date")
        .order("date", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }
      if (data) {
        const mapped: Transaction[] = data.map((t: TxRow) => ({
          id: String(t.id),
          description: t.desc,
          amount: String(t.amount ?? ""),
          category: t.category,
          date: t.date,
        }));
        setTransactions(mapped);
      }
    };
    fetchTransactions();
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
          .from("transactions")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;

        setTransactions((prev) =>
          prev
            .map((t) => (t.id === editingId ? { ...formData, id: editingId } : t))
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
        );
        setEditingId(null);
      } else {
        const { data, error } = await supabase
          .from("transactions")
          .insert([payload])
          .select("id, desc, amount, category, date")
          .single();
        if (error) throw error;
        if (data) {
          const inserted: Transaction = {
            id: String(data.id),
            description: data.desc,
            amount: String(data.amount ?? ""),
            category: data.category,
            date: data.date,
          };
          setTransactions((prev) =>
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

  const handleDelete = async (id?: string) => {
    if (!id) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setFormData(transaction);
    setEditingId(transaction.id || null);
  };

  const getTotalForCurrentMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const total = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
      })
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    return total.toFixed(2);
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-left">Mes dépenses</h1>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-100 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg space-y-3">
        <p className="font-semibold text-sm sm:text-base">Ajouter une dépense</p>
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
            className="p-2 border rounded bg-white dark:bg-neutral-900 min-w-0"
          >
            <option value="" disabled>
              Catégorie
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="p-2 border rounded bg-white dark:bg-neutral-900 min-w-0"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white p-2 rounded w-full"
        >
          {editingId ? "Modifier" : "Ajouter"}
        </button>
      </form>

      <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg text-red-800 dark:text-red-200 font-bold text-lg">
        💰 Total des dépenses du mois : {getTotalForCurrentMonth()} €
      </div>

      {/* Vue cartes mobile */}
      <div className="mt-6 space-y-3 sm:hidden">
        {transactions.map((t) => (
          <div
            key={t.id}
            className={`rounded border border-gray-300 dark:border-neutral-700 p-3 bg-white dark:bg-neutral-900 flex justify-between gap-3`}
          >
            <div className="text-sm min-w-0">
              <p className="font-medium truncate">{t.description}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {new Date(t.date).toLocaleDateString()} • {t.category}
              </p>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="font-semibold text-sm">{t.amount} €</p>
              <div className="mt-1 flex gap-2 text-xs">
                <button onClick={() => handleEdit(t)} className="text-blue-600 hover:text-blue-800">✏️</button>
                <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Tableau desktop */}
      <div className="mt-4 overflow-x-auto hidden sm:block">
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
            {transactions.map((t) => (
              <tr
                key={t.id}
                className={`${categoryColors[t.category] || "bg-white dark:bg-neutral-900"} border border-black dark:border-neutral-700 dark:text-black`}
              >
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap max-w-[180px] truncate" title={t.description}>{t.description}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{t.amount}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{t.category}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 space-x-2 whitespace-nowrap">
                  <button onClick={() => handleEdit(t)} className="text-blue-600 hover:text-blue-800">✏️</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
