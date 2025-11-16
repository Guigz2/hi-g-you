"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface MonthlyPaymentRow {
  id: string;
  desc: string;
  amount: number | string;
  category: string;
  type: string;
}

interface MonthlyPayment {
  id?: string;
  description: string;
  amount: string; // keep string for input
  category: string;
  type: string; // "Dépense" | "Crédit"
}

const paymentCategoriesExpense = [
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

const paymentCategoriesCredit = [
  "Salaire",
  "Prime",
  "Remboursement",
  "Revenu passif",
  "Autres",
] as const;

const paymentType = ["Dépense", "Crédit"] as const;

const typeColors: Record<string, string> = {
  Crédit: "bg-green-200",
  Dépense: "bg-red-200",
};
const softTypeColors: Record<string, string> = {
  Crédit: "bg-green-50 dark:bg-green-900/30",
  Dépense: "bg-red-50 dark:bg-red-900/30",
};

export default function MonthlyPaymentsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [formData, setFormData] = useState<MonthlyPayment>({
    description: "",
    amount: "",
    category: "",
    type: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial monthly payments
  useEffect(() => {
    const fetchPayments = async () => {
      setError(null);
      const { data, error } = await supabase
        .from("monthly_payment")
        .select("id, desc, amount, category, type")
        .order("id", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }
      if (data) {
        setPayments(
          data.map((p: MonthlyPaymentRow) => ({
            id: String(p.id),
            description: p.desc,
            amount: String(p.amount ?? ""),
            category: p.category,
            type: p.type,
          }))
        );
      }
    };
    fetchPayments();
  }, [supabase]);

  // Dynamic categories based on type
  useEffect(() => {
    if (formData.type === "Dépense") setAvailableCategories([...paymentCategoriesExpense]);
    else if (formData.type === "Crédit") setAvailableCategories([...paymentCategoriesCredit]);
    else setAvailableCategories([]);
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      desc: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      type: formData.type,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("monthly_payment")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        setPayments((prev) =>
          prev.map((p) => (p.id === editingId ? { ...formData, id: editingId } : p))
        );
        setEditingId(null);
      } else {
        const { data, error } = await supabase
          .from("monthly_payment")
          .insert([payload])
          .select("id, desc, amount, category, type")
          .single();
        if (error) throw error;
        if (data) {
          const inserted: MonthlyPayment = {
            id: String(data.id),
            description: data.desc,
            amount: String(data.amount ?? ""),
            category: data.category,
            type: data.type,
          };
          setPayments((prev) => [inserted, ...prev]);
        }
      }
      setFormData({ description: "", amount: "", category: "", type: "" });
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (payment?: MonthlyPayment) => {
    if (!payment?.id) return;
    const confirmText = `Confirmer la suppression:\n\nDescription: ${payment.description}\nMontant: ${payment.amount} €\nCatégorie: ${payment.category}\nType: ${payment.type}`;
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;
    const { error } = await supabase.from("monthly_payment").delete().eq("id", payment.id);
    if (!error) {
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
    }
  };

  const handleEdit = (payment: MonthlyPayment) => {
    setFormData(payment);
    setEditingId(payment.id || null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const totals = payments.reduce(
    (acc, p) => {
      const amt = parseFloat(p.amount) || 0;
      if (p.type === "Dépense") acc.expenses += amt;
      else if (p.type === "Crédit") acc.credits += amt;
      return acc;
    },
    { expenses: 0, credits: 0 }
  );

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-center">💳 Mensualités (Crédits & Dépenses) 💳</h1>

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
            name="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value, category: "" })}
            required
            className="p-2 border rounded bg-white dark:bg-neutral-900 min-w-0"
          >
            <option value="" disabled>Type</option>
            {paymentType.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            name="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            disabled={!formData.type}
            className="p-2 border rounded bg-white dark:bg-neutral-900 min-w-0 disabled:opacity-50"
          >
            <option value="" disabled>Catégorie</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white p-2 rounded w-full"
        >
          {editingId ? "Modifier" : "Ajouter"}
        </button>
      </form>

      <div className="mt-4 p-4 rounded-lg bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 flex flex-col sm:flex-row sm:justify-around gap-2 text-sm">
        <p className="text-red-600 font-semibold">Dépenses : {totals.expenses.toFixed(2)} €</p>
        <p className="text-green-600 font-semibold">Crédits : {totals.credits.toFixed(2)} €</p>
        <p className="font-semibold">Solde : {(totals.credits - totals.expenses).toFixed(2)} €</p>
      </div>

      {/* Cartes mobile */}
      <div className="mt-6 space-y-3 sm:hidden">
        {payments.map((p) => (
          <div
            key={p.id}
            className={`rounded border border-gray-300 dark:border-neutral-700 p-3 flex justify-between gap-3 ${softTypeColors[p.type] || 'bg-white dark:bg-neutral-900'}`}
          >
            <div className="flex flex-col min-w-0 text-sm">
              <p className="font-medium truncate">{p.description}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{p.category} • {p.type}</p>
              <div className="mt-2">
                <button
                  onClick={() => handleEdit(p)}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  aria-label="Modifier mensualité"
                >
                  ✏️ Modifier
                </button>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between">
              <p className="font-semibold text-sm">{p.amount} €</p>
              <button
                onClick={() => handleDelete(p)}
                className="text-red-600 hover:text-red-800 text-xs"
                aria-label="Supprimer mensualité"
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
              <th className="text-center p-2 border border-black dark:border-neutral-700">Type</th>
              <th className="text-center p-2 border border-black dark:border-neutral-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr
                key={p.id}
                className={`${typeColors[p.type] || 'bg-white dark:bg-neutral-900'} border border-black dark:border-neutral-700 dark:text-black`}
              >
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap max-w-[180px] truncate" title={p.description}>{p.description}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{p.amount}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{p.category}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 whitespace-nowrap">{p.type}</td>
                <td className="text-center p-2 border border-black dark:border-neutral-700 space-x-2 whitespace-nowrap">
                  <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800">✏️</button>
                  <button onClick={() => handleDelete(p)} className="text-red-600 hover:text-red-800">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
